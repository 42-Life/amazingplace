import {useCallback, useState} from 'react';
import {useFocusEffect} from 'expo-router';
import ChallengeList from '@/components/explore/ChallengeList';
import {Text, View} from 'react-native';
import {challengeListStyles as styles} from '@/constants/styles';
import {fetchParticipatingChallenges, type ParticipatingChallenge} from '@/lib/challenges';

// Temporary local entries for testing the participating list layout.
const TEST_CHALLENGES: ParticipatingChallenge[] = [
    {
        id: 'test-charles-river',
        title: 'Charles River Views',
        description: 'Capture your favorite view of the Charles River.',
        joinedAt: '2026-11-17T15:30:00Z',
        endAt: '2099-12-31',
    },
    {
        id: 'test-campus-details',
        title: 'Hidden Campus Details',
        description: 'Find a small detail around campus that most people walk past every day. Look for interesting patterns, unusual architecture, colorful murals, or unexpected reflections, and photograph it from a fresh angle to show everyone something they may never have noticed before.',
        joinedAt: '2026-11-16T19:15:00Z',
        endAt: '2099-12-31',
    },
];

export default function ParticipatingChallenges() {
    const [revision, setRevision] = useState(0);

    return <ParticipatingChallengeList key={revision} onRetry={() => setRevision((value) => value + 1)} />;
}

function ParticipatingChallengeList({onRetry}: {onRetry: () => void}) {
    const [challenges, setChallenges] = useState<ParticipatingChallenge[]>([...TEST_CHALLENGES]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Refresh when returning from a challenge so new submissions appear here.
    useFocusEffect(useCallback(() => {
        let active = true;
        setIsLoading(true);
        setErrorMessage(null);

        fetchParticipatingChallenges()
            // Rebuild from the test entries on refresh so fetched entries don't accumulate duplicates.
            .then((result) => {if (active) setChallenges([...TEST_CHALLENGES, ...result]);})
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
                        Competition ends on: {new Date(`${challenge.endAt}T12:00:00`).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'})}
                    </Text>
                </View>
            )}
        />
    );
}
