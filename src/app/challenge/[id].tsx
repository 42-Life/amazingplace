// CHALLENGE SCREEN
// One challenge's title and description. Opened by the "View challenge" button on the map.

// KEY IMPORTS
// Hooks
import {useEffect, useState} from 'react';
// React and Expo functions and components
import {ActivityIndicator, Pressable, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router, useLocalSearchParams} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
// Internal imports
import {theme} from '@/constants/theme';
import {challengeDetailStyles as styles} from '@/constants/styles';
import type {ChallengeLocation} from '@/constants/types';
import {fetchChallengeById} from '@/lib/challenges';


// MAIN FUNCTION
export default function ChallengeScreen() {
    const {colors} = theme;

    // The id from the route, e.g. /challenge/bu-cas-photo-challenge
    const {id} = useLocalSearchParams<{id: string}>();

    const [challenge, setChallenge] = useState<ChallengeLocation | null>(null);

    // Loading useStates:
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // LOAD THIS CHALLENGE FROM SUPABASE
    useEffect(() => {
        let isMounted = true;

        async function loadChallenge() {
            try {
                // Step 1: loading state initiated
                setIsLoading(true);
                setErrorMessage(null);

                // Step 2: get the challenge
                const result = await fetchChallengeById(id);
                if (!isMounted) return;

                // Step 3: show it, or say so if the id matched nothing
                if (result) setChallenge(result);
                else setErrorMessage('That challenge has ended or no longer exists.');
            }
            catch (err) {
                // Error handling -- log for developers, show a readable message to users
                console.error("Could not load challenge from Supabase:", err);
                if (isMounted) setErrorMessage('Could not load this challenge. Please try again.');
            } finally {
                if (isMounted) setIsLoading(false);   // in either case (fail/succeed), state changes to no longer loading.
            }
        }

        // Step 4: Load the challenge & unmount
        loadChallenge();
        return () => { isMounted = false; };          // no longer mounted

    }, [id])   // re-runs if the user opens a different challenge

    return(
        <SafeAreaView style={styles.safe} edges={['top']}>
            {/* 1. Header: back to the map */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} accessibilityLabel="Back" hitSlop={12}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </Pressable>
            </View>

            {/* 2. Body: spinner, error, or the challenge */}
            {isLoading ? (
                <ActivityIndicator style={styles.centered} color={colors.active} />
            ) : errorMessage ? (
                <Text style={[styles.centered, styles.message]}>{errorMessage}</Text>
            ) : challenge && (
                <View style={styles.body}>
                    <Text style={styles.title}>{challenge.title}</Text>
                    <Text style={styles.description}>{challenge.description}</Text>
                </View>
            )}
        </SafeAreaView>
    )
}
