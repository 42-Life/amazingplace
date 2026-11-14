// CHALLENGE SCREEN
// One challenge's title and description. Opened by the "View challenge" button on the map.
// This is the only place the camera lives: photos taken here go to this challenge only.

// KEY IMPORTS
// Hooks
import { useEffect, useState } from 'react';
// React and Expo functions and components
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Internal imports
import ChallengeCamera from '@/components/capture/ChallengeCamera';
import ChallengeSubmissionsGrid from '@/components/capture/ChallengeSubmissionsGrid';
import ChallengeAreaMap, { formatRadius } from '@/components/ChallengeAreaMap';
import { challengeDetailStyles as styles } from '@/constants/styles';
import { theme } from '@/constants/theme';
import type { ChallengeLocation } from '@/constants/types';
import { fetchChallengeById } from '@/lib/challenges';


// MAIN FUNCTION
export default function ChallengeScreen() {
    const {colors} = theme;

    // The id from the route, e.g. /challenge/bu-cas-photo-challenge
    const {id} = useLocalSearchParams<{id: string}>();

    const [challenge, setChallenge] = useState<ChallengeLocation | null>(null);

    // Loading useStates:
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);     // true while the camera covers the page

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
                if (result) {
                    setChallenge(result);
                } else {
                    setErrorMessage('That challenge has ended or no longer exists.');
                }
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

    // CAMERA: takes over the whole screen, locked to this challenge
    if (isCameraOpen && challenge) {
        return <ChallengeCamera challenge={challenge} onClose={() => setIsCameraOpen(false)} />
    }

    return(
        <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
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
                <>
                    <ChallengeSubmissionsGrid
                        key={challenge.id}
                        challengeId={challenge.id}
                        header={<View style={styles.details}>
                            <Text style={styles.title}>{challenge.title}</Text>
                            <ChallengeAreaMap
                                coordinate={{latitude: Number(challenge.latitude), longitude: Number(challenge.longitude)}}
                                radiusM={Number(challenge.radius_m)}
                                style={styles.areaMap}
                            />
                            <Text style={styles.description}>{challenge.description}</Text>
                            <Text style={styles.areaTitle}>Photo radius: {formatRadius(Number(challenge.radius_m))}</Text>
                            <Text style={styles.areaTitle}>
                                End date: {new Date(`${challenge.end_at}T12:00:00`).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'})}
                            </Text>
                        </View>}
                    />
                    <View style={styles.footer}>
                        <Pressable
                            onPress={() => setIsCameraOpen(true)}
                            accessibilityRole="button"
                            style={({pressed}) => [styles.enterButton, pressed && styles.enterButtonPressed]}
                        >
                            <Text style={styles.enterButtonText}>Enter Challenge</Text>
                        </Pressable>
                    </View>
                </>
            )}
        </SafeAreaView>
    )
}
