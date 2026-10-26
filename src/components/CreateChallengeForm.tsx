// CREATE CHALLENGE FORM
// Three-step form for making a new challenge: details, then location, then a final review.

// KEY IMPORTS
// Hooks
import {useState} from 'react';
// React and Expo functions and components
import {ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import MapView, {type Region} from 'react-native-maps';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
// Internal imports
import {theme} from '@/constants/theme';
import {createChallengeStyles as styles} from '@/constants/styles';
import {createChallenge} from '@/lib/challenges';

// Where the map starts on step 2: BU College of Arts and Sciences
const START_REGION: Region = {
    latitude: 42.350294,
    longitude: -71.105765,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
}

const TOTAL_STEPS = 3;
const STEP_TITLES = ['Details', 'Location', 'Review'];


// MAIN FUNCTION
export default function CreateChallengeForm() {
    const {colors} = theme;

    // Form state
    const [step, setStep] = useState(1);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [coordinate, setCoordinate] = useState({latitude: START_REGION.latitude, longitude: START_REGION.longitude});   // the spot under the pin
    const [isSubmitting, setIsSubmitting] = useState(false);         // true while saving; blocks double submits

    // Step 1 is only done once both fields have text
    const isDetailsValid = title.trim().length > 0 && description.trim().length > 0;
    const canGoNext = step === 1 ? isDetailsValid : true;

    // Reset the form back to a blank step 1
    const resetForm = () => {
        setStep(1);
        setTitle('');
        setDescription('');
        setCoordinate({latitude: START_REGION.latitude, longitude: START_REGION.longitude});
    }

    // KEY HANDLER: SUBMIT
    const submit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await createChallenge({title, description, ...coordinate});
            Alert.alert('Challenge created', `"${title.trim()}" is now live on the map.`);
            resetForm();
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
                </ScrollView>
            </KeyboardAvoidingView>
        )
    }

    // STEP 2: PICK LOCATION
    //   The pin never moves on screen. The user drags the map under it,
    //   and whatever is at the centre when they let go is the location.
    function LocationStep() {
        return(
            <View style={styles.mapWrapper}>
                <MapView
                    style={{flex: 1}}
                    initialRegion={{...START_REGION, ...coordinate}}   // reopens where the user left off if they came back from step 3
                    mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
                    onRegionChangeComplete={(region) => setCoordinate({latitude: region.latitude, longitude: region.longitude})}
                />
                <View style={styles.pinCentered} pointerEvents="none">
                    <Ionicons name="location" size={40} color={colors.active} />
                </View>
                <View style={styles.coordinateBadge} pointerEvents="none">
                    <Text style={styles.coordinateBadgeText}>
                        {coordinate.latitude.toFixed(6)}, {coordinate.longitude.toFixed(6)}
                    </Text>
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

                <Text style={styles.label}>Location</Text>
                <View style={styles.reviewMap}>
                    <MapView
                        style={{flex: 1}}
                        region={{latitudeDelta: 0.005, longitudeDelta: 0.005, ...coordinate}}
                        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        rotateEnabled={false}
                        pitchEnabled={false}
                    />
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
                <Text style={styles.stepLabel}>Step {step} of {TOTAL_STEPS}: {STEP_TITLES[step - 1]}</Text>
                <View style={styles.progressTrack}>
                    {STEP_TITLES.map((_, i) => (
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
