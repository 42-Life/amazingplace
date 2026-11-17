import {useCallback, useState} from 'react';
import {ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {router, useFocusEffect} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {fetchCreatedChallenges} from '@/lib/challenges';
import type {ChallengeLocation} from '@/constants/types';
import {theme} from '@/constants/theme';
import {challengeListStyles as listStyles} from '@/constants/styles';
import {getChallengeDate} from '@/utils/challenge-dates';

export default function ChallengeDashboard() {
    const [revision, setRevision] = useState(0);
    return <DashboardList key={revision} onRetry={() => setRevision((value) => value + 1)} />;
}

function DashboardList({onRetry}: {onRetry: () => void}) {
    const insets = useSafeAreaInsets();
    const [challenges, setChallenges] = useState<ChallengeLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useFocusEffect(useCallback(() => {
        let active = true;
        setLoading(true);
        setError(null);
        fetchCreatedChallenges()
            .then((result) => {if (active) setChallenges(result);})
            .catch((err) => {
                console.error('Could not load created challenges:', err);
                if (active) setError('Could not load your challenges. Please try again.');
            })
            .finally(() => {if (active) setLoading(false);});
        return () => {active = false;};
    }, []));

    const today = getChallengeDate();
    return (
        <FlatList
            style={listStyles.fill}
            contentContainerStyle={[styles.content, {paddingTop: insets.top + 20}]}
            data={challenges}
            keyExtractor={(challenge) => challenge.id}
            ItemSeparatorComponent={() => <View style={listStyles.separator} />}
            ListHeaderComponent={
                <View style={styles.header}>
                    <Text style={styles.title}>Challenge dashboard</Text>
                    <Text style={styles.hint}>Create a challenge or manage the ones you’ve made.</Text>
                    <Pressable accessibilityRole="button" onPress={() => router.push('/create-challenge')} style={({pressed}) => [styles.createButton, pressed && listStyles.pressed]}>
                        <Ionicons name="add" size={24} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Create challenge</Text>
                    </Pressable>
                    <Text style={styles.sectionTitle}>Your challenges</Text>
                </View>
            }
            ListEmptyComponent={loading ? <ActivityIndicator color={theme.colors.active} accessibilityLabel="Loading your challenges" />
                : error ? <View style={styles.status}>
                    <Text style={styles.hint} accessibilityRole="alert">{error}</Text>
                    <Pressable accessibilityRole="button" onPress={onRetry} style={listStyles.retry}><Text style={listStyles.retryText}>Try again</Text></Pressable>
                </View> : <Text style={styles.hint}>You haven’t created any challenges yet.</Text>}
            renderItem={({item}) => (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit challenge: ${item.title}`}
                    onPress={() => router.push({pathname: '/manage-challenge/[id]', params: {id: item.id}})}
                    style={({pressed}) => [listStyles.row, pressed && listStyles.pressed]}
                >
                    <View style={listStyles.cardBody}>
                        <Text style={listStyles.title}>{item.title}</Text>
                        <Text style={listStyles.description} numberOfLines={2} ellipsizeMode="tail">{item.description}</Text>
                        <Text style={styles.hint}>{item.end_at < today ? 'Ended' : item.start_at > today ? 'Upcoming' : 'Active'} · Ends {new Date(`${item.end_at}T12:00:00`).toLocaleDateString()}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={22} color={theme.colors.inactive} />
                </Pressable>
            )}
        />
    );
}

const styles = StyleSheet.create({
    content: {flexGrow: 1, padding: 20},
    header: {gap: 12, paddingBottom: 16},
    title: {fontSize: 24, fontWeight: '700', color: theme.colors.text},
    sectionTitle: {fontSize: 20, fontWeight: '700', color: theme.colors.text, marginTop: 12},
    hint: {fontSize: 14, lineHeight: 20, color: theme.colors.inactive},
    createButton: {minHeight: 48, borderRadius: 12, padding: 12, backgroundColor: theme.colors.active, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
    buttonText: {fontSize: 16, fontWeight: '700', color: '#FFFFFF'},
    status: {alignItems: 'center', gap: 8},
});
