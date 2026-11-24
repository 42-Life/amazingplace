import {useCallback, useState} from 'react';
import {useFocusEffect} from 'expo-router';
import ChallengeList from '@/components/explore/ChallengeList';
import {Text, View} from 'react-native';
import {challengeListStyles as styles} from '@/constants/styles';
import {fetchParticipatingChallenges, type ParticipatingChallenge} from '@/lib/challenges';
import {describeChallengePhase} from '@/utils/challenge-dates';

export default function JoinedScreen() {
    const [revision, setRevision] = useState(0);

    function ParticipatingChallengeList({onRetry}: {onRetry: () => void}) {
        const [challenges, setChallenges] = useState<ParticipatingChallenge[]>([]);
        const [isLoading, setIsLoading] = useState(true);
        const [errorMessage, setErrorMessage] = useState<string | null>(null);

        // Refresh when returning from a challenge so new submissions appear here.
        useFocusEffect(useCallback(() => {
            let active = true;
            setIsLoading(true);
            setErrorMessage(null);

            fetchParticipatingChallenges()
                .then((result) => {if (active) setChallenges(result);})
                .catch((error) => {
                    console.error('Could not load participating challenges:', error);
                    if (active) setErrorMessage('Could not load your challenges. Please try again.');
                })
                .finally(() => {if (active) setIsLoading(false);});

            return () => {active = false;};
        }, []));

        return (
            <ChallengeList
                layout="rows"
                challenges={challenges}
                isLoading={isLoading}
                errorMessage={errorMessage}
                onRetry={onRetry}
                searchQuery=""
                emptyTitle="No participating challenges yet"
                emptyMessage="Submit a photo to a challenge in Explore to see it here."
                renderDetails={(challenge) => (
                    <View style={styles.participationTags}>
                        <Text style={styles.participationTag}>
                            Joined on: {new Date(challenge.joinedAt).toLocaleString(undefined, {year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})}
                        </Text>
                        <Text style={styles.participationTag}>
                            {describeChallengePhase({start_at: challenge.startAt, end_at: challenge.endAt, voting_end_at: challenge.votingEndAt})}
                        </Text>
                    </View>
                )}
            />
        );
    }

    return (
        <View style={styles.fill}>
            <ParticipatingChallengeList key={revision} onRetry={() => setRevision((value) => value + 1)} />
        </View>
    );
}
