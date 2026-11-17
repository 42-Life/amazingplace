import {useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router, useLocalSearchParams} from 'expo-router';
import EditChallengeForm from '@/components/EditChallengeForm';
import {fetchCreatedChallengeById} from '@/lib/challenges';
import type {ChallengeLocation} from '@/constants/types';
import {theme} from '@/constants/theme';

export default function ManageChallengeScreen() {
    const {id} = useLocalSearchParams<{id: string}>();
    const [challenge, setChallenge] = useState<ChallengeLocation | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        let active = true;
        fetchCreatedChallengeById(id)
            .then((result) => {if (active) setChallenge(result);})
            .catch((err) => {if (active) setError(err instanceof Error ? err.message : 'Could not load this challenge.');});
        return () => {active = false;};
    }, [id, revision]);

    if (challenge) return <EditChallengeForm key={challenge.id} challenge={challenge} onClose={() => router.back()} />;

    return (
        <SafeAreaView style={styles.safe}>
            <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.button}><Text style={styles.text}>Back to dashboard</Text></Pressable>
            <View style={styles.center}>
                {error ? <>
                    <Text style={styles.text} accessibilityRole="alert">{error}</Text>
                    <Pressable accessibilityRole="button" style={styles.button} onPress={() => {setError(null); setRevision((value) => value + 1);}}><Text style={styles.text}>Try again</Text></Pressable>
                </> : <ActivityIndicator color={theme.colors.active} accessibilityLabel="Loading challenge" />}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {flex: 1, backgroundColor: theme.colors.background, padding: 20},
    center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12},
    button: {minHeight: 44, justifyContent: 'center'},
    text: {fontSize: 16, color: theme.colors.text},
});
