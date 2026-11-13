// EXPLORE SCREEN
// Map and list of challenge locations. Tap a pin to see the challenge's details,
// or long-press anywhere to create a new challenge on that spot.

// KEY IMPORTS
// React/Expo
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LocationAccuracy } from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapView, { type LatLng, type LongPressEvent, Marker, type Region } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Internal Imports
import ChallengeList from '@/components/explore/ChallengeList';
import ChallengeFilterModal from '@/components/explore/ChallengeFilterModal';
import CreateChallengeForm from '@/components/CreateChallengeForm';
import { challengeMapMarkersStyles, challengeListStyles as styles } from "@/constants/styles";
import { theme } from "@/constants/theme";
import { ChallengeLocation } from "@/constants/types";
import { fetchChallenges } from "@/lib/challenges";
import { filterChallengesByStartDate, searchChallengesByName, type ChallengeStartDateFilter } from '@/lib/filter';
import { getChallengeDate } from '@/utils/challenge-dates';
import {
    ActivityIndicator,
    Keyboard,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";

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
    const insets = useSafeAreaInsets();   // status bar height; floating controls sit below it while the map runs behind it
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    const [reloadCount, setReloadCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchDraft, setSearchDraft] = useState('');
    const [filtersVisible, setFiltersVisible] = useState(false);
    const [startDateFilter, setStartDateFilter] = useState<ChallengeStartDateFilter>({from: '', through: ''});
    const activeStartDateFilter = useRef(startDateFilter);
    const hasDateFilter = !!(startDateFilter.from || startDateFilter.through);
    const mapRef = useRef<MapView>(null);
    const defaultChallenges = useRef<ChallengeLocation[] | null>(null);
    const defaultChallengesDate = useRef<string | null>(null);
    const searchVersion = useRef(0);
    const [lastMapRegion, setLastMapRegion] = useState<Region | null>(null);

    // Location useStates
    const [selectedLocation, setSelectedLocation] = useState<ChallengeLocation | null>(null);
    const [locations, setLocations] = useState<ChallengeLocation[]>([]);   // empty list by default. Should pull from Supabase in actuality
    const visibleLocations = useMemo(() => filterChallengesByStartDate(locations, startDateFilter), [locations, startDateFilter]);
    const [initialRegion, setInitialRegion] = useState<Region | null>(null);   // null until we know where to start the map
    const [hasLocationPermission, setHasLocationPermission] = useState(false); // controls the blue "you are here" dot
    const [userCoordinate, setUserCoordinate] = useState<LatLng | null>(null);   // live position; null until the first update

    // Loading useStates:
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Draft challenge: set by long-pressing the map, cleared once saved or cancelled.
    //   While set, the create-challenge form is open with this spot already chosen.
    const [draftCoordinate, setDraftCoordinate] = useState<LatLng | null>(null);

    const focusChallenge = useCallback((challenge: ChallengeLocation | null) => {
        setSelectedLocation(challenge);
        if (!challenge) return;
        const region: Region = {
            latitude: Number(challenge.latitude),
            longitude: Number(challenge.longitude),
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
        };
        setLastMapRegion(region);
        mapRef.current?.animateToRegion(region, 400);
    }, []);

    const applyStartDateFilter = (filter: ChallengeStartDateFilter) => {
        activeStartDateFilter.current = filter;
        setStartDateFilter(filter);
        setFiltersVisible(false);
        setDraftCoordinate(null);
        const matches = filterChallengesByStartDate(locations, filter);
        focusChallenge(matches[0] ?? null);
    };

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
        const version = searchVersion.current;

        async function loadChallenges() {
            try {
                // Step 1: loading state initiated
                setIsLoading(true);
                setErrorMessage(null);

                // Step 2: get challenges
                const today = getChallengeDate();
                if (defaultChallengesDate.current !== today) defaultChallenges.current = null;
                const challenges = searchQuery
                    ? await searchChallengesByName(searchQuery)
                    : defaultChallenges.current ?? await fetchChallenges();
                // Step 3: set challenges
                if (!isMounted || version !== searchVersion.current) return;
                if (!searchQuery) {
                    defaultChallenges.current = challenges;
                    defaultChallengesDate.current = today;
                }
                setLocations(challenges);

                const matches = filterChallengesByStartDate(challenges, activeStartDateFilter.current);
                if (searchQuery) focusChallenge(matches[0] ?? null);
            }
            catch (err) {
                // Error handling -- display error to inform developers that challengers weren't loaded. Display error for users also
                console.error("Could not log challenges from Supabase:", err);
                if (isMounted && version === searchVersion.current) setErrorMessage("Could not load challenges. Please try again.");
            } finally {
                if (isMounted && version === searchVersion.current) setIsLoading(false);
            }
        }

        // Step 4: Load the challenges & unmount
        loadChallenges();
        return () => { isMounted = false; };        // no longer mounted

    }, [reloadCount, searchQuery, focusChallenge]);

    const submitSearch = (text: string) => {
        searchVersion.current += 1;
        Keyboard.dismiss();
        setSearchQuery(text.trim());
        setReloadCount((count) => count + 1);
        setIsLoading(true);
        setSelectedLocation(null);
        setDraftCoordinate(null);
    };

    const clearSearchResults = () => {
        searchVersion.current += 1;
        Keyboard.dismiss();
        setSearchDraft('');
        setSearchQuery('');
        setSelectedLocation(null);
        setDraftCoordinate(null);
        setErrorMessage(null);
        if (defaultChallengesDate.current !== getChallengeDate()) defaultChallenges.current = null;
        if (defaultChallenges.current) {
            setLocations(defaultChallenges.current);
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }
        setLastMapRegion(initialRegion);
        if (initialRegion) mapRef.current?.animateToRegion(initialRegion, 400);
    };

    // Tap Handler: Used for setting new challenge locations
    // TODO: Implement error handling; forbid setting challenges in certain locations potentially? Strech goal.
    const handleMarkerPress = (location: ChallengeLocation) => {
        setSelectedLocation(location);
    }

    // LONG PRESS HANDLER: start a new challenge wherever the user held down
    const handleLongPress = (event: LongPressEvent) => {
        setSelectedLocation(null);          // hide any open challenge card so the popups can't overlap
        setDraftCoordinate(event.nativeEvent.coordinate);
    }

    // Closes the form and removes the dropped pin
    const cancelDraft = () => setDraftCoordinate(null);

    // KEY HANDLER: NEW CHALLENGE SAVED
    // The form saves the challenge and shows the confirmation; here we just put it on the map
    const handleChallengeCreated = (created: ChallengeLocation) => {
        if (!draftCoordinate) return;

        // Add the pin to the map straight away, so it shows without a reload
        //   Keep the coordinate we pressed: the markers need real numbers, and fetchChallenges
        //   is the only thing that coerces what the database sends back
        const newChallenge = {...created, ...draftCoordinate};
        setLocations((current) => [...current, newChallenge]);
        if (defaultChallenges.current) {
            defaultChallenges.current = [...defaultChallenges.current, newChallenge]
                .sort((a, b) => a.title.localeCompare(b.title));
        }
        setDraftCoordinate(null);
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
                        tracksViewChanges
                        onPress={(e) => {
                            e.stopPropagation();
                            handleMarkerPress(location);
                        }}
                    >
                        <View
                            collapsable={false}
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

    return(
        <SafeAreaView style={styles.fill} edges={['left', 'right']}>
            <View style={styles.fill}>
                {viewMode === 'list' && (
                    <ChallengeList
                        challenges={visibleLocations}
                        hasDateFilter={hasDateFilter}
                        searchQuery={searchQuery}
                        isLoading={isLoading}
                        errorMessage={errorMessage}
                        onRetry={() => {setIsLoading(true); setReloadCount((count) => count + 1);}}
                    />
                )}
                {viewMode === 'map' && <View style={styles.fill}>
                    {initialRegion ? (
                        <MapView
                            ref={mapRef}
                            style={StyleSheet.absoluteFill} // ensures MapView fills the full area of its parent container
                            initialRegion={lastMapRegion ?? initialRegion}
                            onRegionChangeComplete={setLastMapRegion}
                            mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'} // mutedStandard is IOS only; softer colours
                            onPress={() => {Keyboard.dismiss(); setSelectedLocation(null);}}
                            onLongPress={handleLongPress}
                            // Used to show the location of the user
                            showsUserLocation={hasLocationPermission}
                            showsMyLocationButton={hasLocationPermission}
                            mapPadding={{top: insets.top + 80, right: 0, bottom: 0, left: 0}}
                        >
                            {/* STEP 1: Show all location markers, orange*/}
                            {SetMarkers(visibleLocations, selectedLocation)}

                            {/* Pin dropped where the user long-pressed, until they save or cancel */}
                            {draftCoordinate && (
                                <Marker coordinate={draftCoordinate} anchor={{x: 0.5, y: 1}} tracksViewChanges>
                                    <View collapsable={false} accessibilityLabel="New challenge location">
                                        <Ionicons name="location" size={40} color={colors.active} />
                                    </View>
                                </Marker>
                            )}
                        </MapView>
                    ) : <ActivityIndicator style={styles.centered} color={colors.active} />}
                    {
                        DisplayChallengeInfoCard() // Displays Challenge information conditionally, ie if a location has been selected
                    }
                </View>}
                <View style={[styles.searchBar, {top: insets.top + 16}]}>
                    <Ionicons name="search-outline" size={22} color={colors.inactive} />
                    <TextInput
                        style={styles.searchInput}
                        accessibilityLabel="Search challenges"
                        placeholder="Search challenges"
                        placeholderTextColor={colors.inactive}
                        value={searchDraft}
                        onChangeText={setSearchDraft}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="search"
                        onSubmitEditing={(event) => submitSearch(event.nativeEvent.text)}
                        underlineColorAndroid="transparent"
                    />
                    {searchDraft.length > 0 && (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Clear search"
                            onPress={() => setSearchDraft('')}
                            style={styles.clearSearch}
                        >
                            <Ionicons name="close-circle" size={20} color={colors.inactive} />
                        </Pressable>
                    )}
                </View>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={hasDateFilter ? 'Filters, start date filter applied' : 'Filters'}
                    accessibilityState={{expanded: filtersVisible}}
                    onPress={() => {Keyboard.dismiss(); setFiltersVisible(true);}}
                    style={({pressed}) => [styles.toggleButton, {top: insets.top + 16}, styles.filterButton, hasDateFilter && styles.filterActive, pressed && styles.pressed]}
                >
                    <Ionicons name={hasDateFilter ? 'funnel' : 'funnel-outline'} size={24} color={hasDateFilter ? colors.background : colors.text} />
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={viewMode === 'map' ? 'Switch to list view' : 'Switch to map view'}
                    onPress={() => {Keyboard.dismiss(); setViewMode((current) => current === 'map' ? 'list' : 'map');}}
                    style={({pressed}) => [styles.toggleButton, {top: insets.top + 16}, pressed && styles.pressed]}
                >
                    <Ionicons
                        name={viewMode === 'map' ? 'list-outline' : 'map-outline'}
                        size={24}
                        color={colors.text}
                    />
                </Pressable>
                {searchQuery.length > 0 && (
                    <View pointerEvents="box-none" style={[styles.clearResultsRow, {top: insets.top + 80}]}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={hasDateFilter ? 'Clear search and keep date filters' : 'Clear search and show all challenges'}
                                    onPress={clearSearchResults}
                            style={({pressed}) => [styles.clearResultsButton, pressed && styles.pressed]}
                        >
                            {/* <Ionicons name="close-outline" size={20} color={colors.text} /> */}
                            <Text style={styles.clearResultsText}>Clear search</Text>
                        </Pressable>
                    </View>
                )}
            </View>
            {/* CREATE CHALLENGE FORM: opened by a long press, with that spot already chosen */}
            {draftCoordinate && (
                <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={cancelDraft}>
                    <CreateChallengeForm
                        fixedCoordinate={draftCoordinate}
                        onCreated={handleChallengeCreated}
                        onCancel={cancelDraft}
                    />
                </Modal>
            )}
            {filtersVisible && (
                <ChallengeFilterModal
                    filters={startDateFilter}
                    onApply={applyStartDateFilter}
                    onClose={() => setFiltersVisible(false)}
                />
            )}
        </SafeAreaView>
    )
}
