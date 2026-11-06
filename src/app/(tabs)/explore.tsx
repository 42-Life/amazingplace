// EXPLORE SCREEN
// Map of challenge locations. Tap a pin to see the challenge's details,
// or long-press anywhere to create a new challenge on that spot.

// KEY IMPORTS
// React/Expo
import {useEffect, useState} from 'react';
import MapView, {type LatLng, type LongPressEvent, Marker, type Region} from 'react-native-maps';
import {router} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import * as Location from 'expo-location';
import {LocationAccuracy} from 'expo-location';

// Internal Imports
import {theme} from "@/constants/theme";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import {ChallengeLocation} from "@/constants/types";
import {challengeMapMarkersStyles, userLocationMarkerStyles} from "@/constants/styles";
import {createChallenge, fetchChallenges} from "@/lib/challenges";

// CONSTANTS FOR MAP
// Initial Location: BU College of Arts and Sciences
const FALLBACK_LOCATION: Region = {
    latitude: 42.350294,
    longitude: -71.105765,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
}

// Zoom level when we start on the user's location. The smaller the value, the more zoomed in. Can play around with this.
const USER_LOCATION_DELTA = 0.05

// MAIN FUNCTION
export default function ExploreScreen() {
    const {colors} = theme;

    // Location useStates
    const [selectedLocation, setSelectedLocation] = useState<ChallengeLocation | null>(null);
    const [locations, setLocations] = useState<ChallengeLocation[]>([]);   // empty list by default. Should pull from Supabase in actuality
    const [initialRegion, setInitialRegion] = useState<Region | null>(null);   // null until we know where to start the map
    const [hasLocationPermission, setHasLocationPermission] = useState(false); // controls the blue "you are here" dot
    const [userCoordinate, setUserCoordinate] = useState<LatLng | null>(null);   // live position; null until the first update

    // Loading useStates:
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Draft challenge: set by long-pressing the map, cleared once saved or cancelled
    const [draftCoordinate, setDraftCoordinate] = useState<LatLng | null>(null);
    const [draftTitle, setDraftTitle] = useState('');
    const [draftDescription, setDraftDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);        // true while saving; blocks double submits

    // Both fields need text before the challenge can be saved (same rule as the full form)
    const isDraftValid = draftTitle.trim().length > 0 && draftDescription.trim().length > 0;

    // useEffect to pick location
    useEffect(() => {
        let isMounted = true;

        async function chooseInitialRegion() {
            let region = FALLBACK_LOCATION; // starts here if all below fails

            try {
                // STEP 1: Ask user for location permission (or check if already provided)
                const {status} = await Location.requestForegroundPermissionsAsync()

                if (status === 'granted') {
                    if (isMounted) setHasLocationPermission(true);

                    // STEP 2: Check for cached location; otherwise get location for GPS
                    const position =
                        /*
                        * Checks if a position has been cached in the last 5 mins. If yes, we get this near-instantly.
                        * Adjust if needed (eg: if this causes issue for walking/moving user)
                        * If last location was cached > 5mins ago, this returns null, and then executes the next line
                        * Which gets the present location (slower)
                        * */
                        (await Location.getLastKnownPositionAsync({maxAge: 5*60*1000}))
                            ??
                        (await Location.getCurrentPositionAsync({accuracy: LocationAccuracy.Balanced})); // accuracy to 100m. Use High for 10m accuracy

                    // STEP 3: Define area for the map to start on, now centered on the user's location
                    region = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        latitudeDelta: USER_LOCATION_DELTA,
                        longitudeDelta: USER_LOCATION_DELTA,
                    };
                }
            } catch (err) {
                // runs when permission granted, but couldn't access location. Uses fallback.
                console.error("Could not get user location: ", err);
            }
            // STEP 4: Set the intial location to the region assigned
            if (isMounted) setInitialRegion(region);
        }
        chooseInitialRegion()
            .catch(err => console.error("Location choice error:", err));

        return () => {isMounted = false;};
    }, []);

    // useEffect to display the user's live location once they have granted permission
    // Re-runs only when permission changes
    // TODO: use this functionality to implement geofencing: ie obscure information depending on user proximity to challenges
    useEffect(() => {
        // Step 1: Check for permissions. Return if it hasn't been granted
        if (!hasLocationPermission) return

        // Step 2: set mounted flag (true) and initialise location subscripttion to null
        let isMounted = true;
        let subscription: Location.LocationSubscription | null = null;

        // Step 3: Watch for location
        async function startWatching() {
            try {
                const sub = await Location.watchPositionAsync(
                    {
                        accuracy: LocationAccuracy.High,    // 10m accuracy. High so we can accurately follor the usr
                                                            // Change to balanced if it causes the app to run slow
                        distanceInterval: 5,                // Updates only if user moved 5 metres or more
                        timeInterval: 2500,                 // and updates at most every 2.5 seconds
                    },
                    (position) => {
                        setUserCoordinate(position.coords);
                    }
                );

                if (isMounted) {
                    subscription = sub; // update subscription with new location info
                } else {
                    sub.remove();       // deleted new location info otherwise
                }
            } catch (err) {
                console.error("Could not watch user's location: ", err);
            }
        }

        // async Run function
        startWatching();

        // Cleanup step. Ensures GPS doesn't stay running
        return () => {
            isMounted = false;
            subscription?.remove();
        }
    }, []);

    // Load Challenge Pins from Supabase for Markers
    useEffect(() => {
        let isMounted = true;

        async function loadChallenges() {
            try {
                // Step 1: loading state initiated
                setIsLoading(true);
                setErrorMessage(null);

                // Step 2: get challenges
                const challenges = await fetchChallenges();
                // Step 3: set challenges
                if (isMounted) setLocations(challenges);
            }
            catch (err) {
                // Error handling -- display error to inform developers that challengers weren't loaded. Display error for users also
                console.error("Could not log challenges from Supabase:", err);
                if (isMounted) setErrorMessage("Could not load challenges. Please try again.");
            } finally {
                if (isMounted) setIsLoading(false); // in either case (fail/succeed), state changes to no longer loading.
            }
        }

        // Step 4: Load the challenges & unmount
        loadChallenges();
        return () => { isMounted = false; };        // no longer mounted

    }, [])   // empty array = run once, when the screen first mounts

    // Tap Handler: Used for setting new challenge locations
    // TODO: Implement error handling; forbid setting challenges in certain locations potentially? Strech goal.
    const handleMarkerPress = (location: ChallengeLocation) => {
        setSelectedLocation(location);
    }

    // LONG PRESS HANDLER: start a new challenge wherever the user held down
    const handleLongPress = (event: LongPressEvent) => {
        setSelectedLocation(null);          // hide any open challenge card so the popups can't overlap
        setDraftCoordinate(event.nativeEvent.coordinate);
        setDraftTitle('');
        setDraftDescription('');
    }

    // Closes the popup and removes the dropped pin
    const cancelDraft = () => setDraftCoordinate(null);

    // KEY HANDLER: SAVE THE NEW CHALLENGE
    const saveDraft = async () => {
        // STEP 1: Make sure there's a spot on the map and we're not already saving
        if (!draftCoordinate || isSaving) return;
        setIsSaving(true);

        try {
            // STEP 2: Save the challenge at the pressed coordinate (see src/lib/challenges.ts)
            const created = await createChallenge({
                title: draftTitle,
                description: draftDescription,
                ...draftCoordinate,
            });

            // STEP 3: Add the pin to the map straight away, so it shows without a reload
            //   Keep the coordinate we pressed: the markers need real numbers, and fetchChallenges
            //   is the only thing that coerces what the database sends back
            setLocations((current) => [...current, {...created, ...draftCoordinate}]);
            setDraftCoordinate(null);
            Alert.alert('Challenge created', `"${created.title}" is now live on the map.`);
        } catch (err: any) {
            // STEP 4: On failure, keep the popup open so the user can try again
            console.error("Could not create challenge: ", err);
            Alert.alert('Could not create challenge', err?.message ?? 'Something went wrong. Please try again.');
        } finally {
            setIsSaving(false);
        }
    }

    function SetMarkers(locations:ChallengeLocation[], selectedLocation:ChallengeLocation|null) {
        return (locations.map((location:ChallengeLocation) =>
            {
                const isLocationSelected = selectedLocation?.id === location.id;

                return(
                    <Marker
                        key={location.id}
                        coordinate={{latitude: location.latitude, longitude: location.longitude}}
                        anchor={{x: 0.5, y:0.5}}
                        tracksViewChanges={false}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleMarkerPress(location);
                        }}
                    >
                        <View
                            accessibilityLabel={location.title}   // without this the map is unusable with a screen reader
                            style={[
                                challengeMapMarkersStyles.dot,
                                {backgroundColor: isLocationSelected ? colors.text : colors.active},
                                isLocationSelected && challengeMapMarkersStyles.dotSelected
                            ]}
                        />
                    </Marker>
                );
            })
        )
    }

    function DisplayChallengeInfoCard() {
        // Hidden while a new challenge is being written, so the two popups can't overlap
        if (!selectedLocation || draftCoordinate) return null;

        return(
            <View style={[challengeMapMarkersStyles.card, {backgroundColor: colors.background}]}>
                <Text style={[challengeMapMarkersStyles.cardTitle, {color: colors.text}]}>{selectedLocation.title}</Text>
                <Text style={[challengeMapMarkersStyles.cardBody, {color: colors.text}]}>{selectedLocation.description}</Text>
                <Pressable
                    style={[challengeMapMarkersStyles.button, {backgroundColor: colors.active}]}
                    onPress={() => router.push(`/challenge/${selectedLocation.id}`)}
                >
                    <Text style={challengeMapMarkersStyles.buttonText}>View challenge</Text>
                </Pressable>
            </View>
        )
    }

    // POPUP FOR A NEW CHALLENGE
    // Shown after a long press: name it, describe it, and save it at that spot
    function DisplayNewChallengeCard() {
        if (!draftCoordinate) return null;

        return(
            <KeyboardAvoidingView
                style={challengeMapMarkersStyles.draftSheet}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={[challengeMapMarkersStyles.card, {backgroundColor: colors.background}]}>
                    <Text style={[challengeMapMarkersStyles.cardTitle, {color: colors.text}]}>New challenge here</Text>
                    <Text style={[challengeMapMarkersStyles.cardBody, {color: colors.inactive}]}>
                        {draftCoordinate.latitude.toFixed(6)}, {draftCoordinate.longitude.toFixed(6)}
                    </Text>

                    <TextInput
                        style={challengeMapMarkersStyles.input}
                        value={draftTitle}
                        onChangeText={setDraftTitle}
                        placeholder="Name"
                        placeholderTextColor={colors.inactive}
                        maxLength={80}
                    />
                    <TextInput
                        style={[challengeMapMarkersStyles.input, challengeMapMarkersStyles.inputMultiline]}
                        value={draftDescription}
                        onChangeText={setDraftDescription}
                        placeholder="What should people photograph?"
                        placeholderTextColor={colors.inactive}
                        multiline
                        maxLength={500}
                    />

                    <View style={challengeMapMarkersStyles.cardButtons}>
                        <Pressable
                            style={[
                                challengeMapMarkersStyles.button,
                                challengeMapMarkersStyles.buttonInRow,
                                challengeMapMarkersStyles.buttonSecondary,
                                isSaving && challengeMapMarkersStyles.buttonDisabled,
                            ]}
                            onPress={cancelDraft}
                            disabled={isSaving}
                        >
                            <Text style={challengeMapMarkersStyles.buttonTextSecondary}>Cancel</Text>
                        </Pressable>

                        <Pressable
                            style={[
                                challengeMapMarkersStyles.button,
                                challengeMapMarkersStyles.buttonInRow,
                                {backgroundColor: colors.active},
                                (!isDraftValid || isSaving) && challengeMapMarkersStyles.buttonDisabled,
                            ]}
                            onPress={saveDraft}
                            disabled={!isDraftValid || isSaving}
                        >
                            {isSaving
                                ? <ActivityIndicator color="#FFFFFF" />
                                : <Text style={challengeMapMarkersStyles.buttonText}>Create challenge</Text>}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        )
    }

    // Before returning, wait for location permission or location update
    if (!initialRegion) {
        return(
            <View
                style={{
                    flex: 1, justifyContent: 'center', alignItems: 'center',
                    backgroundColor: colors.background,
                }}
            >
                <ActivityIndicator color={colors.active} />
            </View>
        )
    }

    return(
        <View style={{flex:1}}>
            <MapView
                style={StyleSheet.absoluteFill} // ensures MapView fills the full area of its parent container
                initialRegion={initialRegion} // uses region set
                mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'} // mutedStandard is IOS only; softer colours
                onPress={() => setSelectedLocation(null)}
                onLongPress={handleLongPress}
                // Used to show the location of the user
                showsUserLocation={hasLocationPermission}
                showsMyLocationButton={hasLocationPermission}
            >
                {/* STEP 1: Show all location markers, orange*/}
                {SetMarkers(locations, selectedLocation)}

                {/* Pin dropped where the user long-pressed, until they save or cancel */}
                {draftCoordinate && (
                    <Marker coordinate={draftCoordinate} anchor={{x: 0.5, y: 1}} tracksViewChanges={false}>
                        <View accessibilityLabel="New challenge location">
                            <Ionicons name="location" size={40} color={colors.active} />
                        </View>
                    </Marker>
                )}
            </MapView>
            {
                DisplayChallengeInfoCard() // Displays Challenge information conditionally, ie if a location has been selected
            }
            {
                DisplayNewChallengeCard()  // Displays the new-challenge popup after a long press
            }
        </View>
    )
}