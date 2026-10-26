// EXPLORE SCREEN
// Map of challenge locations. Tap a pin to see the challenge's details.

// KEY IMPORTS
// React/Expo
import {useEffect, useState} from 'react';
import MapView, {Marker, type Region} from 'react-native-maps';
// Internal Imports
import {theme} from "@/constants/theme";
import {View, Platform, Pressable, Text, StyleSheet} from "react-native";
import {ChallengeLocation, LOCATIONS} from "@/constants/types";
import {challengeMapMarkersStyles} from "@/constants/styles";
import {fetchChallenges} from "@/lib/photos";

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
    const [locations, setLocations] = useState<ChallengeLocation[]>(LOCATIONS);   // starts with the built-in list, replaced by the database's list once loaded

    // LOAD CHALLENGE PINS FROM SUPABASE (once, when the map first opens)
    useEffect(() => {
        (async () => {
            try {
                // STEP 1: Fetch every challenge from the database
                const challenges = await fetchChallenges();

                // STEP 2: Show them on the map (keep the built-in list if the database is empty)
                if (challenges.length > 0) setLocations(challenges);
            } catch (err) {
                // STEP 3: If the request fails (e.g. no internet), keep showing the built-in list
                console.error("Could not load challenges from Supabase: ", err);
            }
        })();
    }, []);

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