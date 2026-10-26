// EXPLORE SCREEN
// Map of challenge locations. Tap a pin to see the challenge's details.

// KEY IMPORTS
// React/Expo
import {useEffect, useState} from 'react';
import MapView, {Marker, type Region} from 'react-native-maps';
// Internal Imports
import {theme} from "@/constants/theme";
import {View, Platform, Pressable, Text, StyleSheet} from "react-native";
import {ChallengeLocation} from "@/constants/types";
import {challengeMapMarkersStyles} from "@/constants/styles";
import {fetchChallenges} from "@/lib/challenges";

// Initial Location: BU College of Arts and Sciences
const INITIAL_LOCATION: Region = {
    latitude: 42.350294,
    longitude: -71.105765,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
}

// MAIN FUNCTION
export default function ExploreScreen() {
    const {colors} = theme;
    const [selectedLocation, setSelectedLocation] = useState<ChallengeLocation | null>(null);
    const [locations, setLocations] = useState<ChallengeLocation[]>([]);   // empty list by default. Should pull from Supabase in actuality

    // Loading useStates:
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        loadChallenges().then(res => console.log("Result of loading challenges", res));     // testing purposes; can remove .then() later
        return () => { isMounted = false; };        // no longer mounted

    })

    // Tap Handler: Used for setting new challenge locations
    // TODO: Implement error handling; forbid setting challenges in certain locations potentially? Strech goal.
    const handleMarkerPress = (location: ChallengeLocation) => {
        setSelectedLocation(location);
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
        if (!selectedLocation) return null;

        return(
            <View style={[challengeMapMarkersStyles.card, {backgroundColor: colors.background}]}>
                <Text style={[challengeMapMarkersStyles.cardTitle, {color: colors.text}]}>{selectedLocation.title}</Text>
                <Text style={[challengeMapMarkersStyles.cardBody, {color: colors.text}]}>{selectedLocation.description}</Text>
                <Pressable
                    style={[challengeMapMarkersStyles.button, {backgroundColor: colors.active}]}
                    onPress={() => console.log('Will navigate to challenge:', selectedLocation.id)}
                    // placeholder, to implement full functionality
                    // idea is that pressing this will navigate to the challenge page
                >
                    <Text style={challengeMapMarkersStyles.buttonText}>View challenge</Text>
                </Pressable>
            </View>
        )
    }

    return(
        <View style={{flex:1}}>
            <MapView
                style={StyleSheet.absoluteFill} // ensures MapView fills the full area of its parent container
                initialRegion={INITIAL_LOCATION}
                mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'} // mutedStandard is IOS only; softer colours
                onPress={() => setSelectedLocation(null)}
            >
                {SetMarkers(locations, selectedLocation)}
            </MapView>
            {
                DisplayChallengeInfoCard() // Displays Challenge information conditionally, ie if a location has been selected
            }
        </View>
    )
}