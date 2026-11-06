// CHALLENGES SCREEN
// Every challenge, nearest first, with a search box to filter them by keyword.
// Tapping a row opens that challenge; "+ New Challenge" opens the create form.

// KEY IMPORTS
// Hooks
import {useCallback, useState} from 'react';
// React and Expo functions and components
import {FlatList, Pressable, Text, TextInput, View} from 'react-native';
import {router, useFocusEffect} from 'expo-router';
// Internal imports
import ScreenShell from '@/components/ScreenShell';
import {theme} from '@/constants/theme';
import {challengeListStyles as styles} from '@/constants/styles';
import type {ChallengeLocation} from '@/constants/types';
import {fetchChallenges} from '@/lib/challenges';
import {getDistanceInMiles, getUserLocation} from '@/lib/location';

// A challenge plus how far away it is (null when we don't know where the user is)
type ChallengeWithDistance = ChallengeLocation & {distance: number | null};


// COMPARE BY DISTANCE
// Tells the sort which of two challenges is closer, so the nearest ends up first
function compareByDistance(a: ChallengeWithDistance, b: ChallengeWithDistance): number {
    return (a.distance ?? 0) - (b.distance ?? 0);
}


// MAIN FUNCTION
export default function ChallengesScreen() {
    const [challenges, setChallenges] = useState<ChallengeWithDistance[]>([]);
    const [searchText, setSearchText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLocationOff, setIsLocationOff] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // LOAD ON FOCUS
    // Runs every time the user switches to this tab, so newly created challenges show up.
    //   The spinner only shows on the first load; after that the old list stays up while it refreshes.
    useFocusEffect(useCallback(function loadOnFocus() {
        // LOAD CHALLENGES
        // Fetches every challenge and shows it straight away, then adds distances once the location arrives.
        //   Two separate steps so a slow GPS fix can never hold up the list itself.
        async function loadChallenges() {
            // STEP 1: Get the challenges and show them A to Z (the order fetchChallenges returns them in)
            let list: ChallengeLocation[] = [];
            try {
                list = await fetchChallenges();
                const withoutDistances: ChallengeWithDistance[] = [];
                for (const challenge of list) {
                    withoutDistances.push({...challenge, distance: null});
                }
                setChallenges(withoutDistances);
                setErrorMessage(null);
            } catch (err) {
                // Log for developers, show a readable message to users
                console.error('Could not load challenges:', err);
                setErrorMessage('Could not load challenges. Please try again.');
                return;
            } finally {
                setIsLoading(false);
            }

            // STEP 2: Get the user's location. Stop here if we can't (the A to Z list stays up)
            const location = await getUserLocation();
            setIsLocationOff(location === null);
            if (!location) return;

            // STEP 3: Add a distance to each challenge
            const withDistances: ChallengeWithDistance[] = [];
            for (const challenge of list) {
                const distance = getDistanceInMiles(location.latitude, location.longitude, challenge.latitude, challenge.longitude);
                withDistances.push({...challenge, distance});
            }

            // STEP 4: Sort nearest first and show the updated list
            withDistances.sort(compareByDistance);
            setChallenges(withDistances);
        }

        loadChallenges();
    }, []));

    // GET VISIBLE CHALLENGES
    // Keeps only the challenges whose title or description contains the search text (ignoring case)
    function getVisibleChallenges(): ChallengeWithDistance[] {
        // STEP 1: Lowercase the search once, so "Park" and "park" match the same things
        const keyword = searchText.trim().toLowerCase();

        // STEP 2: Go through every challenge and keep the ones that match
        const matches: ChallengeWithDistance[] = [];
        for (const challenge of challenges) {
            const inTitle = challenge.title.toLowerCase().includes(keyword);
            const inDescription = challenge.description.toLowerCase().includes(keyword);
            if (inTitle || inDescription) matches.push(challenge);
        }
        return matches;
    }

    // OPEN NEW CHALLENGE
    // Goes to the create-challenge form
    function openNewChallenge() {
        router.push('/new-challenge');
    }

    // RENDER CHALLENGE ROW
    // One tappable row: title, short description, and the distance if we know it
    function renderChallengeRow({item}: {item: ChallengeWithDistance}) {
        // STEP 1: Open this challenge's page when the row is tapped
        function openChallenge() {
            router.push({pathname: '/challenge/[id]', params: {id: item.id}});
        }

        // STEP 2: Draw the row
        return (
            <Pressable style={styles.row} onPress={openChallenge}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowDescription} numberOfLines={2}>{item.description}</Text>
                {item.distance !== null && <Text style={styles.rowDistance}>{item.distance.toFixed(1)} mi away</Text>}
            </Pressable>
        );
    }

    // GET CHALLENGE KEY
    // Gives FlatList a unique key for each row
    function getChallengeKey(item: ChallengeWithDistance): string {
        return item.id;
    }

    // Pick which message (if any) to show instead of, or above, the list
    const visibleChallenges = getVisibleChallenges();
    let message = null;
    if (isLoading) message = 'Loading challenges...';
    else if (errorMessage) message = errorMessage;
    else if (visibleChallenges.length === 0) message = 'No challenges match your search.';

    return (
        <ScreenShell title="Challenges">
            <View style={styles.container}>
                {/* 1. Top: new challenge button and search box */}
                <Pressable style={styles.newButton} onPress={openNewChallenge}>
                    <Text style={styles.newButtonText}>+ New Challenge</Text>
                </Pressable>
                <TextInput
                    style={styles.search}
                    placeholder="Search challenges"
                    placeholderTextColor={theme.colors.inactive}
                    value={searchText}
                    onChangeText={setSearchText}
                />

                {/* 2. Location note, shown when the user said no to sharing their location */}
                {isLocationOff && <Text style={styles.message}>Location is off, so challenges are listed A to Z.</Text>}

                {/* 3. The list, or a message if there is nothing to show */}
                {message && <Text style={styles.message}>{message}</Text>}
                {!message && <FlatList data={visibleChallenges} renderItem={renderChallengeRow} keyExtractor={getChallengeKey} />}
            </View>
        </ScreenShell>
    );
}
