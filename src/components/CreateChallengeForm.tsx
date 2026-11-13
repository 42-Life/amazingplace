// CREATE CHALLENGE FORM
// Three-step form for making a new challenge: details, then location (and radius), then a final review.
// Used by the Challenges tab, and by the map's long-press (which passes in the location already chosen,
// so step 2 only sets the radius).

// KEY IMPORTS
// Hooks
import {useState} from 'react';
// React and Expo functions and components
import {ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import MapView, {Circle, type LatLng, type Region} from 'react-native-maps';
import {Slider} from '@expo/ui/community/slider';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
// Internal imports
import {theme} from '@/constants/theme';
import {createChallengeStyles as styles} from '@/constants/styles';
import {createChallenge} from '@/lib/challenges';
import DateSelector from '@/components/explore/DateSelector';
import {getChallengeDate} from '@/utils/challenge-dates';
import type {ChallengeLocation} from '@/constants/types';

// Where the map starts on step 2: BU College of Arts and Sciences
const START_REGION: Region = {
    latitude: 42.350294,
    longitude: -71.105765,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
}

// Radius slider: how far from the pin photos may be taken, in meters
const MIN_RADIUS_M = 25;
const MAX_RADIUS_M = 1000;
const RADIUS_STEP_M = 25;
const DEFAULT_RADIUS_M = 100;

// Shown as "Nov 20, 2026" (the date is read at midday so time zones can't shift it a day)
const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});

// Shown as "250 m" or "1 km"
const formatRadius = (meters: number) => meters >= 1000 ? `${meters / 1000} km` : `${meters} m`;

// Map zoom that fits the whole radius circle on screen, centered on the pin
const regionForRadius = (center: LatLng, radiusM: number): Region => {
    const delta = (radiusM * 2.5) / 111000;     // ~111 km per degree of latitude; 2.5 leaves a margin around the circle
    return {...center, latitudeDelta: delta, longitudeDelta: delta};
}

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
    const [coordinate, setCoordinate] = useState(startCoordinate);   // the spot under the pin
    const [radiusM, setRadiusM] = useState(DEFAULT_RADIUS_M);        // photos must be taken within this many meters of the pin
    const [endAt, setEndAt] = useState('');                         // last day of the challenge, YYYY-MM-DD ('' = not picked yet)
    const [isSubmitting, setIsSubmitting] = useState(false);         // true while saving; blocks double submits

    // Step 1 is only done once both fields have text and an end date is picked
    const isDetailsValid = title.trim().length > 0 && description.trim().length > 0 && endAt !== '';
    const canGoNext = step === 1 ? isDetailsValid : true;

    // Reset the form back to a blank step 1
    const resetForm = () => {
        setStep(1);
        setTitle('');
        setDescription('');
        setCoordinate(startCoordinate);
        setRadiusM(DEFAULT_RADIUS_M);
        setEndAt('');
    }

    // Back to a blank form, unless the caller wants to take over
    const finish = (created: ChallengeLocation) => {
        if (onCreated) onCreated(created);
        else resetForm();
    }

    // KEY HANDLER: SUBMIT
    const submit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            // STEP 1: Save the challenge
            const created = await createChallenge({title, description, ...coordinate, radius_m: radiusM, end_at: endAt});

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
                <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="e.g. Best photo of the Charles River"
                        placeholderTextColor={colors.inactive}
                        maxLength={80}
                    />

                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.inputMultiline]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="What should people photograph?"
                        placeholderTextColor={colors.inactive}
                        multiline
                        maxLength={500}
                    />
                    <Text style={styles.hint}>{description.length}/500</Text>

                    <Text style={styles.label}>End date</Text>
                    <DateSelector
                        label="End date"
                        value={endAt}
                        onChange={setEndAt}
                        minimumDate={getChallengeDate()}
                    />
                    <Text style={styles.hint}>The challenge runs through the end of this day.</Text>
                </ScrollView>
            </KeyboardAvoidingView>
        )
    }

    // STEP 2: PICK LOCATION AND RADIUS
    //   The pin never moves on screen. The user drags the map under it,
    //   and whatever is at the centre when they let go is the location.
    //   The slider below sets how far from the pin photos may be taken (drawn as a circle).
    //   With a fixedCoordinate the map is locked on that spot and zooms to fit the circle instead.
    function LocationStep() {
        return(
            <View style={styles.body}>
            <View style={styles.mapWrapper}>
                {fixedCoordinate ? (
                    <MapView
                        style={{flex: 1}}
                        region={regionForRadius(coordinate, radiusM)}
                        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        rotateEnabled={false}
                        pitchEnabled={false}
                    >
                        <Circle center={coordinate} radius={radiusM} strokeColor={colors.active} fillColor="rgba(255, 90, 54, 0.15)" />
                    </MapView>
                ) : (
                <MapView
                    style={{flex: 1}}
                    initialRegion={{...START_REGION, ...coordinate}}   // reopens where the user left off if they came back from step 3
                    mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
                    onRegionChangeComplete={(region) => setCoordinate({latitude: region.latitude, longitude: region.longitude})}
                >
                    <Circle center={coordinate} radius={radiusM} strokeColor={colors.active} fillColor="rgba(255, 90, 54, 0.15)" />
                </MapView>
                )}
                <View style={styles.pinCentered} pointerEvents="none">
                    <Ionicons name="location" size={40} color={colors.active} />
                </View>
                <View style={styles.coordinateBadge} pointerEvents="none">
                    <Text style={styles.coordinateBadgeText}>
                        {coordinate.latitude.toFixed(6)}, {coordinate.longitude.toFixed(6)}
                    </Text>
                </View>
            </View>

            {/* Radius slider */}
            <View style={styles.radiusPanel}>
                <Text style={styles.label}>Photo radius: {formatRadius(radiusM)}</Text>
                <Slider
                    value={radiusM}
                    minimumValue={MIN_RADIUS_M}
                    maximumValue={MAX_RADIUS_M}
                    step={RADIUS_STEP_M}
                    onValueChange={(value) => setRadiusM(Math.round(value / RADIUS_STEP_M) * RADIUS_STEP_M)}
                    minimumTrackTintColor={colors.active}
                    accessibilityLabel="Photo radius"
                />
                <Text style={styles.hint}>Photos must be taken within this distance of the pin.</Text>
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

                <Text style={styles.label}>Description</Text>
                <Text style={styles.reviewValue}>{description.trim()}</Text>

                <Text style={styles.label}>Latitude</Text>
                <Text style={styles.reviewValue}>{coordinate.latitude.toFixed(6)}</Text>

                <Text style={styles.label}>Longitude</Text>
                <Text style={styles.reviewValue}>{coordinate.longitude.toFixed(6)}</Text>

                <Text style={styles.label}>Ends</Text>
                <Text style={styles.reviewValue}>{formatDate(endAt)}</Text>

                <Text style={styles.label}>Photo radius</Text>
                <Text style={styles.reviewValue}>{formatRadius(radiusM)}</Text>

                <Text style={styles.label}>Location</Text>
                <View style={styles.reviewMap}>
                    <MapView
                        style={{flex: 1}}
                        region={regionForRadius(coordinate, radiusM)}
                        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        rotateEnabled={false}
                        pitchEnabled={false}
                    >
                        <Circle center={coordinate} radius={radiusM} strokeColor={colors.active} fillColor="rgba(255, 90, 54, 0.15)" />
                    </MapView>
                    <View style={styles.pinCentered} pointerEvents="none">
                        <Ionicons name="location" size={40} color={colors.active} />
                    </View>
                </View>
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
