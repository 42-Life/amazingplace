// CHALLENGE STATS SCREEN
// How one of the user's own challenges is doing: totals, the 3 most-voted submissions,
// and submissions over time. Opened by tapping a challenge in the Create tab.
// Editing lives one step further in, behind the "Edit challenge" button (manage-challenge/[id]).

// KEY IMPORTS
import {useCallback, useState} from 'react';
import {ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router, useFocusEffect, useLocalSearchParams} from 'expo-router';
// Internal imports
import SubmissionsTimeline from '@/components/stats/SubmissionsTimeline';
import TopSubmissions from '@/components/stats/TopSubmissions';
import {theme} from '@/constants/theme';
import {fetchChallengeStats, type ChallengeStats} from '@/lib/challenge-stats';
import {CHALLENGE_PHASE_LABELS, getChallengeDate, getChallengePhase} from '@/utils/challenge-dates';

const formatDay = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});


// MAIN FUNCTION
export default function ChallengeStatsScreen() {
    const {colors} = theme;
    const {id} = useLocalSearchParams<{id: string}>();

    const [stats, setStats] = useState<ChallengeStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [revision, setRevision] = useState(0);

    // LOAD THE STATS
    //   On focus, not just on mount, so coming back from the edit page shows any changes (a new title, say).
    //   The old numbers stay on screen while the new ones load, so the page doesn't flash a spinner.
    useFocusEffect(useCallback(() => {
        let active = true;
        setIsLoading(true);
        setErrorMessage(null);
        fetchChallengeStats(id)
            .then((result) => {if (active) setStats(result);})
            .catch((err) => {
                console.error('Could not load challenge stats:', err);
                if (active) setErrorMessage(err instanceof Error ? err.message : 'Could not load the stats. Please try again.');
            })
            .finally(() => {if (active) setIsLoading(false);});
        return () => {active = false;};
    }, [id, revision]));

    const reload = () => setRevision((value) => value + 1);

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
            {/* 1. Header: back to the Create tab, and the way into editing */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </Pressable>
                <Pressable
                    onPress={() => router.push({pathname: '/manage-challenge/[id]', params: {id}})}
                    disabled={!stats}
                    accessibilityRole="button"
                    accessibilityState={{disabled: !stats}}
                    style={({pressed}) => [styles.editButton, pressed && styles.pressed, !stats && styles.disabled]}
                >
                    <Ionicons name="create-outline" size={18} color={colors.buttonIconColor} />
                    <Text style={styles.editText}>Edit challenge</Text>
                </Pressable>
            </View>

            {/* 2. Body: spinner, error, or the stats */}
            {!stats ? (
                <View style={styles.centered}>
                    {isLoading ? <ActivityIndicator color={colors.active} accessibilityLabel="Loading stats" /> : <>
                        <Text style={styles.message} accessibilityRole="alert">{errorMessage}</Text>
                        <Pressable onPress={reload} accessibilityRole="button" style={styles.retry}>
                            <Text style={styles.link}>Try again</Text>
                        </Pressable>
                    </>}
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.content}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={reload} tintColor={colors.active} />}
                >
                    <StatsBody stats={stats} />
                    {/* A failed refresh keeps the old numbers, and says so */}
                    {errorMessage && <Text style={styles.message} accessibilityRole="alert">{errorMessage}</Text>}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}


// STATS BODY
// Title, totals, top 3, chart. Split out so the screen above stays about loading.
function StatsBody({stats}: {stats: ChallengeStats}) {
    const {challenge, totals, topSubmissions, timeline} = stats;
    const today = getChallengeDate();
    const status = CHALLENGE_PHASE_LABELS[getChallengePhase(challenge, today)];
    const hasStarted = timeline.buckets.length > 0;

    return (
        <>
            {/* 1. Which challenge, and where it is in its run */}
            <View style={styles.titleBlock}>
                <Text style={styles.title}>{challenge.title}</Text>
                <Text style={styles.hint}>
                    {status} · Entries {formatDay(challenge.start_at)} – {formatDay(challenge.end_at)} · Voting until {formatDay(challenge.voting_end_at)}
                </Text>
            </View>

            {/* 2. Totals */}
            <View style={styles.totals}>
                <Total label={totals.submissions === 1 ? 'Submission' : 'Submissions'} value={totals.submissions} />
                <Total label={totals.votes === 1 ? 'Vote' : 'Votes'} value={totals.votes} />
                <Total label={totals.participants === 1 ? 'Person' : 'People'} value={totals.participants} />
            </View>

            {/* 3. Top 3 */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top submissions</Text>
                {topSubmissions.length > 0
                    ? <TopSubmissions submissions={topSubmissions} />
                    : <Text style={styles.hint}>{totals.submissions === 0 ? 'No entries yet.' : 'No votes yet.'}</Text>}
            </View>

            {/* 4. Submissions over time */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Submissions over time</Text>
                {!hasStarted
                    ? <Text style={styles.hint}>The challenge starts on {formatDay(challenge.start_at)}.</Text>
                    : totals.submissions === 0
                        ? <Text style={styles.hint}>No entries yet.</Text>
                        : <SubmissionsTimeline timeline={timeline} />}
            </View>
        </>
    );
}

function Total({label, value}: {label: string; value: number}) {
    return (
        <View style={styles.total} accessible accessibilityLabel={`${value.toLocaleString()} ${label.toLowerCase()}`}>
            <Text style={styles.totalValue}>{value.toLocaleString()}</Text>
            <Text style={styles.totalLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: {flex: 1, backgroundColor: theme.colors.background},
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 12, paddingVertical: 8,
        borderBottomWidth: 1, borderBottomColor: theme.colors.tabBarBorder,
    },
    editButton: {flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: theme.colors.active},
    editText: {fontSize: 15, fontWeight: '700', color: theme.colors.buttonIconColor},
    pressed: {opacity: 0.8},
    disabled: {opacity: 0.5},
    content: {padding: 20, gap: 28},
    titleBlock: {gap: 6},
    title: {fontSize: 26, fontWeight: '700', color: theme.colors.text},
    hint: {fontSize: 14, lineHeight: 20, color: theme.colors.inactive},
    totals: {flexDirection: 'row', gap: 10},
    total: {flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: theme.colors.surfaceMuted, gap: 2},
    totalValue: {fontSize: 24, fontWeight: '700', color: theme.colors.text, fontVariant: ['tabular-nums']},
    totalLabel: {fontSize: 13, color: theme.colors.inactive},
    section: {gap: 12},
    sectionTitle: {fontSize: 20, fontWeight: '700', color: theme.colors.text},
    centered: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8},
    message: {fontSize: 15, color: theme.colors.inactive, textAlign: 'center', paddingHorizontal: 32},
    retry: {minHeight: 44, justifyContent: 'center', paddingHorizontal: 16},
    link: {color: theme.colors.active, fontSize: 16, fontWeight: '600'},
});
