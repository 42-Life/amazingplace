// CREATE CHALLENGE FORM
// Three-step form for making a new challenge: details, then location (and radius), then a final review.
// Used by the Challenges tab, and by the map's long-press (which passes in the location already chosen,
// so step 2 only sets the radius).

// KEY IMPORTS
import TextInput from '@/components/KeyboardTextInput';
// Hooks
import {useState} from 'react';
// React and Expo functions and components
import {ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View} from 'react-native';
import type {LatLng, Region} from 'react-native-maps';
import {Slider} from '@expo/ui/community/slider';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {Image} from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
// Internal imports
import {theme} from '@/constants/theme';
import {createChallengeStyles as styles} from '@/constants/styles';
import {createChallenge} from '@/lib/challenges';
import {getPreviewFile} from '@/utils/media';
import {MAX_PRICE_CENTS, MIN_PRICE_CENTS, formatPrice, parsePrice} from '@/utils/price';
import DateSelector from '@/components/explore/DateSelector';
import ChallengeAreaMap, {formatRadius} from '@/components/ChallengeAreaMap';
import MediaTypePicker from '@/components/MediaTypePicker';
import {getChallengeDate} from '@/utils/challenge-dates';
import type {ChallengeLocation, MediaType} from '@/constants/types';

// Where the map starts on step 2: BU College of Arts and Sciences
const START_REGION: Region = {
    latitude: 42.350294,
    longitude: -71.105765,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
}

// Radius slider: how far from the pin photos and videos may be taken, in meters
const MIN_RADIUS_M = 25;
const MAX_RADIUS_M = 1000;
const RADIUS_STEP_M = 25;
const DEFAULT_RADIUS_M = 100;

// Shown as "Nov 20, 2026" (the date is read at midday so time zones can't shift it a day)
const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});

const TOTAL_STEPS = 3;


// PROPS
// All optional, so the Challenges tab can keep rendering <CreateChallengeForm /> as before
type CreateChallengeFormProps = {
    fixedCoordinate?: LatLng,                           // location already chosen (map long-press); the user can't move it
    onCreated?: (created: ChallengeLocation) => void,   // called after a successful save; the form resets itself if absent
    onCancel?: () => void,                              // shows a Cancel button on step 1 when given
}


// MAIN FUNCTION
export default function CreateChallengeForm({fixedCoordinate, onCreated, onCancel}: CreateChallengeFormProps) {
    const {colors} = theme;
    const startCoordinate = fixedCoordinate ?? {latitude: START_REGION.latitude, longitude: START_REGION.longitude};
    const stepTitles = ['Details', fixedCoordinate ? 'Radius' : 'Location', 'Review'];

    // Form state
    const [step, setStep] = useState(1);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [mediaType, setMediaType] = useState<MediaType>('photo');  // whether entries are photos or videos
    const [priceText, setPriceText] = useState('');                  // entry fee as typed, in dollars ('' = free)
    const [previewUri, setPreviewUri] = useState<string | null>(null);  // preview photo on the phone, uploaded on submit (null = none)
    const [coordinate, setCoordinate] = useState(startCoordinate);   // the spot under the pin
    const [radiusM, setRadiusM] = useState(DEFAULT_RADIUS_M);        // entries must be taken within this many meters of the pin
    const [startAt, setStartAt] = useState(getChallengeDate());      // first day of the challenge, YYYY-MM-DD (starts as today)
    const [endAt, setEndAt] = useState('');                         // last day of the challenge, YYYY-MM-DD ('' = not picked yet)
    const [isSubmitting, setIsSubmitting] = useState(false);         // true while saving; blocks double submits

    // ENTRY FEE
    //   Blank means free. Anything else has to be a real amount Stripe will accept,
    //   so a half-typed "0." can't become a challenge nobody can pay for.
    //   priceError is null while the field is fine, and the reason when it isn't.
    const priceCents = priceText.trim() === '' ? 0 : parsePrice(priceText);
    const priceError = priceCents === null ? 'Enter an amount like 5 or 5.50.'
        : priceCents > 0 && priceCents < MIN_PRICE_CENTS ? `A paid challenge must cost at least ${formatPrice(MIN_PRICE_CENTS)}.`
        : priceCents > MAX_PRICE_CENTS ? `A challenge can't cost more than ${formatPrice(MAX_PRICE_CENTS)}.`
        : null;

    // Step 1 is only done once both fields have text, both dates are picked, and the fee is usable
    const isDetailsValid = title.trim().length > 0 && description.trim().length > 0 && startAt !== '' && endAt !== '' && priceError === null;

    // Changing the start date clears an end date that would now come before it
    const changeStartAt = (value: string) => {
        setStartAt(value);
        if (endAt && value && endAt < value) setEndAt('');
    }
    const canGoNext = step === 1 ? isDetailsValid : true;

    // Wording that changes with the entry type
    const captureVerb = mediaType === 'video' ? 'film' : 'photograph';       // "What should people film?"
    const radiusLabel = `${mediaType === 'video' ? 'Video' : 'Photo'} radius`;

    // Reset the form back to a blank step 1
    const resetForm = () => {
        setStep(1);
        setTitle('');
        setDescription('');
        setMediaType('photo');
        setPriceText('');
        setPreviewUri(null);
        setCoordinate(startCoordinate);
        setRadiusM(DEFAULT_RADIUS_M);
        setStartAt(getChallengeDate());
        setEndAt('');
    }

    // Back to a blank form, unless the caller wants to take over
    const finish = (created: ChallengeLocation) => {
        if (onCreated) onCreated(created);
        else resetForm();
    }

    // KEY HANDLER: PICK A PREVIEW PHOTO
    //   Opens the phone's photo library. No permission request: the system picker hands back
    //   only the photo chosen, so neither iOS nor Android asks for library access first.
    //   allowsEditing is what makes this safe to store: the editor returns a JPEG, so an
    //   iPhone's HEIC originals never reach a bucket that doesn't accept them.
    const pickPreview = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],     // the shape of the card the photo ends up in
                quality: 0.8,       // smaller files, no visible difference on a card
            });
            if (result.canceled) return;

            // Refuse anything storage would reject, while the user can still pick another
            const picked = result.assets[0];
            if (!getPreviewFile(picked.uri)) {
                Alert.alert('Unsupported photo', 'A preview photo must be a JPEG, PNG or WebP image.');
                return;
            }
            setPreviewUri(picked.uri);
        } catch (err: any) {
            Alert.alert('Could not open your photos', err?.message ?? 'Something went wrong. Please try again.');
        }
    }

    // KEY HANDLER: SUBMIT
    const submit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            // STEP 1: Save the challenge, uploading the preview photo if one was picked
            //   priceCents is null only while the field is mid-edit, which isDetailsValid blocks
            const created = await createChallenge(
                {title, description, ...coordinate, radius_m: radiusM, start_at: startAt, end_at: endAt, media_type: mediaType, price_cents: priceCents ?? 0},
                previewUri,
            );

            // STEP 2: Confirm success
            Alert.alert('Challenge created', `"${created.title}" is now live on the map.`);
            finish(created);
        } catch (err: any) {
            Alert.alert('Could not create challenge', err?.message ?? 'Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    // STEP 1: NAME AND DESCRIPTION
    function DetailsStep() {
        return(
            <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="e.g. Best photo of the Charles River"
                        placeholderTextColor={colors.inactive}
                        maxLength={80}
                    />

                    <Text style={styles.label}>Entries</Text>
                    <MediaTypePicker value={mediaType} onChange={setMediaType} />
                    <Text style={styles.hint}>
                        {mediaType === 'video'
                            ? 'People record a video of up to 30 seconds, with sound.'
                            : 'People take a photo.'} This can’t be changed later.
                    </Text>

                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.inputMultiline]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder={`What should people ${captureVerb}?`}
                        placeholderTextColor={colors.inactive}
                        multiline
                        maxLength={500}
                    />
                    <Text style={styles.hint}>{description.length}/500</Text>

                    <Text style={styles.label}>Preview photo</Text>
                    {previewUri ? (
                        <>
                            <Image
                                source={{uri: previewUri}}
                                style={styles.previewImage}
                                contentFit="cover"
                                accessibilityLabel="Chosen preview photo"
                            />
                            <View style={styles.previewActions}>
                                <Pressable accessibilityRole="button" style={styles.previewAction} onPress={pickPreview}>
                                    <Text style={styles.previewActionText}>Change photo</Text>
                                </Pressable>
                                <Pressable accessibilityRole="button" style={styles.previewAction} onPress={() => setPreviewUri(null)}>
                                    <Text style={[styles.previewActionText, styles.previewActionRemove]}>Remove</Text>
                                </Pressable>
                            </View>
                        </>
                    ) : (
                        <Pressable accessibilityRole="button" accessibilityLabel="Add a preview photo" style={styles.previewPicker} onPress={pickPreview}>
                            <Ionicons name="image-outline" size={22} color={colors.inactive} />
                            <Text style={styles.previewPickerText}>Add a photo</Text>
                        </Pressable>
                    )}
                    <Text style={styles.hint}>Optional. Shown on the challenge’s card on the map, so people can see the spot.</Text>

                    <Text style={styles.label}>Entry fee</Text>
                    <TextInput
                        style={styles.input}
                        value={priceText}
                        onChangeText={setPriceText}
                        placeholder="Free"
                        placeholderTextColor={colors.inactive}
                        keyboardType="decimal-pad"
                        maxLength={9}
                    />
                    <Text style={[styles.hint, priceError ? styles.errorHint : null]}>
                        {priceError ?? (priceCents
                            ? `People pay ${formatPrice(priceCents)} once to enter. This can’t be changed later.`
                            : 'Leave this blank to let anyone enter for free.')}
                    </Text>

                    <Text style={styles.label}>Start date</Text>
                    <DateSelector
                        label="Start date"
                        value={startAt}
                        onChange={changeStartAt}
                        minimumDate={getChallengeDate()}
                    />

                    <Text style={styles.label}>End date</Text>
                    <DateSelector
                        label="End date"
                        value={endAt}
                        onChange={setEndAt}
                        minimumDate={startAt || getChallengeDate()}   // can't end before it starts
                    />
                    <Text style={styles.hint}>The challenge runs from the start of the first day through the end of the last.</Text>
                </ScrollView>
            </KeyboardAvoidingView>
        )
    }

    // STEP 2: PICK LOCATION AND RADIUS
    //   The pin never moves on screen. The user drags the map under it,
    //   and whatever is at the centre when they let go is the location.
    //   The slider below sets how far from the pin entries may be taken (drawn as a circle).
    //   With a fixedCoordinate the map is locked on that spot and zooms to fit the circle instead.
    function LocationStep() {
        return(
            <View style={styles.body}>
            <ChallengeAreaMap
                coordinate={coordinate}
                radiusM={radiusM}
                onCoordinateChange={fixedCoordinate ? undefined : setCoordinate}
            />

            {/* Radius slider */}
            <View style={styles.radiusPanel}>
                <Text style={styles.label}>{radiusLabel}: {formatRadius(radiusM)}</Text>
                <Slider
                    value={radiusM}
                    minimumValue={MIN_RADIUS_M}
                    maximumValue={MAX_RADIUS_M}
                    step={RADIUS_STEP_M}
                    onValueChange={(value) => setRadiusM(Math.round(value / RADIUS_STEP_M) * RADIUS_STEP_M)}
                    minimumTrackTintColor={colors.active}
                    accessibilityLabel={radiusLabel}
                />
                <Text style={styles.hint}>{mediaType === 'video' ? 'Videos' : 'Photos'} must be taken within this distance of the pin.</Text>
            </View>
            </View>
        )
    }

    // STEP 3: REVIEW EVERYTHING BEFORE SUBMITTING
    function ReviewStep() {
        return(
            <ScrollView style={styles.body} contentContainerStyle={styles.formContent}>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.reviewValue}>{title.trim()}</Text>

                <Text style={styles.label}>Entries</Text>
                <Text style={styles.reviewValue}>{mediaType === 'video' ? 'Videos (up to 30 seconds)' : 'Photos'}</Text>

                <Text style={styles.label}>Description</Text>
                <Text style={styles.reviewValue}>{description.trim()}</Text>

                <Text style={styles.label}>Preview photo</Text>
                {previewUri
                    ? <Image source={{uri: previewUri}} style={styles.previewImage} contentFit="cover" accessibilityLabel="Chosen preview photo" />
                    : <Text style={styles.reviewValue}>None</Text>}

                <Text style={styles.label}>Entry fee</Text>
                <Text style={styles.reviewValue}>{priceCents ? formatPrice(priceCents) : 'Free'}</Text>

                <Text style={styles.label}>Latitude</Text>
                <Text style={styles.reviewValue}>{coordinate.latitude.toFixed(6)}</Text>

                <Text style={styles.label}>Longitude</Text>
                <Text style={styles.reviewValue}>{coordinate.longitude.toFixed(6)}</Text>

                <Text style={styles.label}>Starts</Text>
                <Text style={styles.reviewValue}>{formatDate(startAt)}</Text>

                <Text style={styles.label}>Ends</Text>
                <Text style={styles.reviewValue}>{formatDate(endAt)}</Text>

                <Text style={styles.label}>{radiusLabel}</Text>
                <Text style={styles.reviewValue}>{formatRadius(radiusM)}</Text>

                <Text style={styles.label}>Location</Text>
                <ChallengeAreaMap coordinate={coordinate} radiusM={radiusM} showCoordinates={false} style={styles.reviewMap} />
            </ScrollView>
        )
    }

    return(
        <SafeAreaView style={styles.safe} edges={['top']}>
            {/* HEADER: title, which step we're on, and a progress bar */}
            <View style={styles.header}>
                <Text style={styles.title}>New Challenge</Text>
                <Text style={styles.stepLabel}>Step {step} of {TOTAL_STEPS}: {stepTitles[step - 1]}</Text>
                <View style={styles.progressTrack}>
                    {stepTitles.map((_, i) => (
                        <View key={i} style={[styles.progressSegment, i < step && styles.progressSegmentDone]} />
                    ))}
                </View>
            </View>

            {/* BODY: changes with the step */}
            {step === 1 && DetailsStep()}
            {step === 2 && LocationStep()}
            {step === 3 && ReviewStep()}

            {/* FOOTER: back and next/submit */}
            <View style={styles.footer}>
                {step === 1 && onCancel && (
                    <Pressable
                        style={[styles.button, styles.buttonSecondary]}
                        onPress={onCancel}
                    >
                        <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Cancel</Text>
                    </Pressable>
                )}
                {step > 1 && (
                    <Pressable
                        style={[styles.button, styles.buttonSecondary, isSubmitting && styles.buttonDisabled]}
                        onPress={() => setStep(step - 1)}
                        disabled={isSubmitting}
                    >
                        <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Back</Text>
                    </Pressable>
                )}
                {step < TOTAL_STEPS ? (
                    <Pressable
                        style={[styles.button, !canGoNext && styles.buttonDisabled]}
                        onPress={() => setStep(step + 1)}
                        disabled={!canGoNext}
                    >
                        <Text style={styles.buttonText}>Next</Text>
                    </Pressable>
                ) : (
                    <Pressable
                        style={[styles.button, isSubmitting && styles.buttonDisabled]}
                        onPress={submit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Create challenge</Text>}
                    </Pressable>
                )}
            </View>
        </SafeAreaView>
    )
}
