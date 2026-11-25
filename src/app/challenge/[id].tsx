// CHALLENGE SCREEN
// One challenge's title and description. Opened by the "View challenge" button on the map.
// This is the only place the camera lives: photos (or videos) taken here go to this challenge only.
//
// Challenges with an entry fee open Stripe's payment sheet before the camera. Paying is
// only the first half of the lock: the database refuses the submission itself unless the
// fee has been confirmed, so a user who skips past this screen still gets nowhere.

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
import ChallengeVideoCamera from '@/components/capture/ChallengeVideoCamera';
import ChallengeSubmissionsGrid from '@/components/capture/ChallengeSubmissionsGrid';
import ChallengeAreaMap, { formatRadius } from '@/components/ChallengeAreaMap';
import { challengeDetailStyles as styles } from '@/constants/styles';
import { theme } from '@/constants/theme';
import type { ChallengeLocation } from '@/constants/types';
import { useChallengeEntry } from '@/hooks/use-challenge-entry';
import { fetchChallengeById } from '@/lib/challenges';
import { isPaidChallenge } from '@/lib/payments';
import { formatPrice } from '@/utils/price';
import { describeChallengePhase, formatChallengeDate, getChallengePhase, getVotingClosedMessage, getVotingStartDate } from '@/utils/challenge-dates';
import ChallengeTagPills from '@/components/ChallengeTagPill'


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

    const isVideoChallenge = challenge?.media_type === 'video';

    // ENTRY OR VOTING?
    //   Entries (and the camera) only during the entry period; votes only during the voting period.
    //   The database enforces both, this just keeps the buttons honest.
    const phase = challenge ? getChallengePhase(challenge) : null;
    const phaseNote = !challenge ? null
        : phase === 'upcoming' ? `Entries open ${formatChallengeDate(challenge.start_at)}. Voting opens ${formatChallengeDate(getVotingStartDate(challenge))}.`
        : phase === 'voting' ? `Entries are closed. Double-tap a submission to vote for it, until the end of ${formatChallengeDate(challenge.voting_end_at)}.`
        : phase === 'closed' ? `This challenge is over. Voting ended ${formatChallengeDate(challenge.voting_end_at)}.`
        : null;
    const isPaid = challenge ? isPaidChallenge(challenge) : false;

    // Whether this user may submit yet, and how to let them pay if not
    const entry = useChallengeEntry(challenge);

    // WHAT THE BUTTON DOES
    //   Already in: straight to the camera.
    //   Not yet: pay first, and only open the camera if that worked.
    const openCamera = () => setIsCameraOpen(true);
    const payThenOpenCamera = async () => {
        const paid = await entry.pay();
        if (paid) openCamera();
    };

    // CAMERA: takes over the whole screen, locked to this challenge
    //   Video challenges get the video camera, photo challenges the photo camera
    if (isCameraOpen && challenge && phase === 'entry') {
        const closeCamera = () => setIsCameraOpen(false);
        return isVideoChallenge
            ? <ChallengeVideoCamera challenge={challenge} onClose={closeCamera} />
            : <ChallengeCamera challenge={challenge} onClose={closeCamera} />
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
                        votingClosedMessage={getVotingClosedMessage(challenge)}
                        header={(submissionCount, voteCount) => <View style={styles.details}>
                            <Text style={styles.title}>{challenge.title}</Text>
                            <ChallengeTagPills tags={challenge.tags} />
                            <View style={styles.tagRow}>
                                <Text style={styles.submissionTag}>{isVideoChallenge ? 'Video challenge' : 'Photo challenge'}</Text>
                                {isPaid && (
                                    <Text style={[styles.submissionTag, styles.priceTag]}>
                                        {formatPrice(challenge.price_cents)} to enter
                                    </Text>
                                )}
                            </View>
                            <ChallengeAreaMap
                                coordinate={{latitude: Number(challenge.latitude), longitude: Number(challenge.longitude)}}
                                radiusM={Number(challenge.radius_m)}
                                style={styles.areaMap}
                            />
                            <Text style={styles.description}>{challenge.description}</Text>
                            <View style={styles.radiusRow}>
                                <Text style={styles.areaTitle}>{isVideoChallenge ? 'Video' : 'Photo'} radius: {formatRadius(Number(challenge.radius_m))}</Text>
                                <Text style={styles.submissionTag} accessibilityLiveRegion="polite">
                                    {submissionCount === null ? 'Submissions: —' : `${submissionCount.toLocaleString()} ${submissionCount === 1 ? 'submission' : 'submissions'}`}
                                </Text>
                            </View>
                            <View style={styles.radiusRow}>
                                <Text style={styles.areaTitle}>
                                    {describeChallengePhase(challenge)}
                                </Text>
                                <Text style={styles.submissionTag} accessibilityLiveRegion="polite">
                                    {voteCount === null ? 'Votes: —' : voteCount === 0 ? 'No votes yet' : `${voteCount.toLocaleString()} ${voteCount === 1 ? 'vote' : 'votes'}`}
                                </Text>
                            </View>
                        </View>}
                    />
                    <View style={styles.footer}>
                        {phaseNote ? (
                            <Text style={styles.phaseNote} accessibilityRole="text">{phaseNote}</Text>
                        ) : <>
                        {entry.errorMessage && (
                            <Text style={styles.paymentError} accessibilityLiveRegion="polite">{entry.errorMessage}</Text>
                        )}
                        <Pressable
                            onPress={entry.hasAccess ? openCamera : payThenOpenCamera}
                            disabled={entry.isChecking || entry.isPaying}
                            accessibilityRole="button"
                            style={({pressed}) => [
                                styles.enterButton,
                                pressed && styles.enterButtonPressed,
                                (entry.isChecking || entry.isPaying) && styles.enterButtonDisabled,
                            ]}
                        >
                            {entry.isChecking || entry.isPaying ? (
                                <ActivityIndicator color={colors.buttonIconColor} />
                            ) : (
                                <Text style={styles.enterButtonText}>
                                    {entry.hasAccess
                                        ? (isVideoChallenge ? 'Record Video' : 'Enter Challenge')
                                        : `Pay ${formatPrice(challenge.price_cents)} to enter`}
                                </Text>
                            )}
                        </Pressable>
                        {/* Reassure repeat visitors that they aren't about to be charged twice */}
                            {isPaid && entry.hasAccess && !entry.isChecking && (
                                <Text style={styles.paymentNote}>
                                    {entry.accessReason === 'creator'
                                        ? 'You created this challenge, so entry is free for you.'
                                        : 'Entry fee paid.'}
                                </Text>
                            )}
                        </>}
                    </View>
                </>
            )}
        </SafeAreaView>
    )
}
