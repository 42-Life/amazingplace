// SUBMISSION SCREEN
// One submission on its own page: the photo (or video) filling the screen at the top,
// and its comments underneath. Opened by tapping a submission on a challenge page.
//
// The photo can be pinched or double-tapped to zoom. Comments load a page at a time,
// with more fetched as the user nears the bottom, so the list can go on as long as it needs to.

// KEY IMPORTS
import {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Ionicons} from '@expo/vector-icons';
import {router, useLocalSearchParams} from 'expo-router';
// Internal imports
import ZoomableImage from '@/components/capture/ZoomableImage';
import SubmissionVideo from '@/components/capture/SubmissionVideo';
import {theme} from '@/constants/theme';
import type {Comment} from '@/constants/types';
import {fetchCommentsPage} from '@/lib/comments';
import {fetchSubmissionById, type SubmissionDetail} from '@/lib/photos';
import {fetchChallengeVotes, removeVote, submitVote, updateVote, type ChallengeVotes} from '@/lib/voting';

// How many comments each trip to the database brings back
const COMMENTS_PER_PAGE = 20;

// Where the comment list stands
//   idle: more may exist, waiting for the user to scroll   loading: fetching a page
//   done: every comment is on screen                       error: the last fetch failed
type CommentsStatus = 'idle' | 'loading' | 'done' | 'error';

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});


// MAIN FUNCTION
export default function SubmissionScreen() {
    const {colors} = theme;
    const {width, height: windowHeight} = useWindowDimensions();

    // The id from the route, e.g. /submission/3f2a...
    const {id} = useLocalSearchParams<{id: string}>();

    const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [comments, setComments] = useState<Comment[]>([]);
    const [commentsStatus, setCommentsStatus] = useState<CommentsStatus>('idle');
    // Ref copies for loadMoreComments: scrolling can ask for the next page several times
    // before the screen has redrawn, and it must not fetch the same page twice
    const isFetchingComments = useRef(false);
    const loadedCount = useRef(0);
    const hasMoreComments = useRef(true);

    // While the photo is zoomed, a drag moves the photo, so the page must not scroll under it
    const [isZoomed, setIsZoomed] = useState(false);

    // Height of the page below the header. The photo's stage fills exactly this much,
    // so it opens full screen and the comments start just below the fold.
    const [listHeight, setListHeight] = useState(0);

    // VOTES
    //   Every vote in this submission's challenge, because a user has one vote per challenge:
    //   voting here may mean moving their vote from another submission. null until loaded.
    const [votes, setVotes] = useState<ChallengeVotes | null>(null);
    const isVoting = useRef(false);   // blocks a second vote while one is saving
    const voteCount = votes?.counts[id] ?? 0;
    const hasMyVote = votes?.mySubmissionId === id;

    // KEY HANDLER: DOUBLE TAP THE PHOTO TO VOTE
    //   No vote yet: cast one. Voted for another submission in this challenge: move the vote here.
    //   Already voted for this one: nothing (the badge takes a vote back, not a double tap).
    async function castVote() {
        if (!submission || !votes || hasMyVote || isVoting.current) return;
        isVoting.current = true;
        const previous = votes.mySubmissionId;
        try {
            if (previous) await updateVote(submission.challengeId, id);
            else await submitVote(submission.challengeId, id);

            // Saved: update the counts here instead of reloading them
            setVotes((current) => {
                if (!current) return current;
                const counts = {...current.counts, [id]: (current.counts[id] ?? 0) + 1};
                if (previous) counts[previous] = Math.max((counts[previous] ?? 1) - 1, 0);
                return {counts, total: previous ? current.total : current.total + 1, mySubmissionId: id};
            });
        } catch (err: any) {
            Alert.alert('Could not vote', err?.message ?? 'Something went wrong. Please try again.');
        } finally {
            isVoting.current = false;
        }
    }

    // KEY HANDLER: TAP THE VOTE BADGE TO TAKE THE VOTE BACK
    async function takeBackVote() {
        if (!submission || !votes || !hasMyVote || isVoting.current) return;
        isVoting.current = true;
        try {
            await removeVote(submission.challengeId);
            setVotes((current) => {
                if (!current) return current;
                const counts = {...current.counts, [id]: Math.max((current.counts[id] ?? 1) - 1, 0)};
                return {counts, total: Math.max(current.total - 1, 0), mySubmissionId: null};
            });
        } catch (err: any) {
            Alert.alert('Could not remove vote', err?.message ?? 'Something went wrong. Please try again.');
        } finally {
            isVoting.current = false;
        }
    }

    // LOAD THE NEXT PAGE OF COMMENTS
    const loadMoreComments = useCallback(async () => {
        if (isFetchingComments.current || !hasMoreComments.current) return;
        isFetchingComments.current = true;
        setCommentsStatus('loading');
        try {
            const page = await fetchCommentsPage(id, loadedCount.current, COMMENTS_PER_PAGE);
            loadedCount.current += page.length;
            hasMoreComments.current = page.length === COMMENTS_PER_PAGE;
            // Skip any comment already on screen (a deleted comment shifts the pages by one)
            setComments((current) => {
                const seen = new Set(current.map((comment) => comment.id));
                return [...current, ...page.filter((comment) => !seen.has(comment.id))];
            });
            setCommentsStatus(hasMoreComments.current ? 'idle' : 'done');
        } catch (err) {
            console.error('Could not load comments:', err);
            setCommentsStatus('error');
        } finally {
            isFetchingComments.current = false;
        }
    }, [id]);

    // LOAD THIS SUBMISSION, THEN ITS FIRST COMMENTS
    useEffect(() => {
        let isMounted = true;

        (async () => {
            try {
                const result = await fetchSubmissionById(id);
                if (!isMounted) return;
                if (result) {
                    setSubmission(result);
                    loadMoreComments();
                    // Votes load on their own, so a votes failure doesn't hide the submission
                    fetchChallengeVotes(result.challengeId)
                        .then((data) => {if (isMounted) setVotes(data);})
                        .catch((err) => console.error('Could not load votes:', err));
                } else {
                    setErrorMessage('That submission no longer exists.');
                }
            } catch (err) {
                console.error('Could not load submission from Supabase:', err);
                if (isMounted) setErrorMessage('Could not load this submission. Please try again.');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        })();

        return () => { isMounted = false; };
    }, [id, loadMoreComments]);

    // TOP OF THE LIST: the photo or video, then the "Comments" heading
    //   Photos get a stage as tall as the page, like the old full-screen viewer.
    //   Videos get a box no taller than 60% of the screen, so the comments stay within reach
    const media = submission ? (
        <View>
            {submission.mediaType === 'video'
                ? <SubmissionVideo videoUrl={submission.imageUrl} width={width} height={Math.min(width * 4 / 3, windowHeight * 0.6)} />
                : <ZoomableImage key={`${width}:${listHeight}`} imageUrl={submission.imageUrl} width={width} height={listHeight} onZoomChange={setIsZoomed} onDoubleTap={castVote} />}
            {/* "Comments" on the left, the vote count on the right, each set in by the same amount */}
            <View style={styles.headingRow}>
                <Text style={styles.heading}>Comments</Text>
                {/* The same badge the challenge page's grid shows, hidden until there is a vote. */}
                {/* Tapping it takes back the user's own vote; it does nothing if they haven't voted for this one */}
                {voteCount > 0 && (
                    <Pressable
                        style={styles.voteBadge}
                        onPress={takeBackVote}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel={`${voteCount.toLocaleString()} ${voteCount === 1 ? 'vote' : 'votes'}${hasMyVote ? ', including yours' : ''}`}
                        accessibilityHint={hasMyVote ? 'Removes your vote' : undefined}
                    >
                        <Text style={styles.voteText}>❤️ {voteCount.toLocaleString()}</Text>
                    </Pressable>
                )}
            </View>
        </View>
    ) : undefined;

    // BOTTOM OF THE LIST: spinner, retry, or the "nothing here" message
    const footer = (
        <View style={styles.status}>
            {commentsStatus === 'loading' ? (
                <ActivityIndicator color={colors.active} accessibilityLabel="Loading comments" />
            ) : commentsStatus === 'error' ? (
                <>
                    <Text style={styles.message}>Could not load comments.</Text>
                    <Pressable onPress={loadMoreComments} accessibilityRole="button" style={styles.retry}>
                        <Text style={styles.link}>Try again</Text>
                    </Pressable>
                </>
            ) : commentsStatus === 'done' && comments.length === 0 ? (
                <Text style={styles.message}>No comments yet.</Text>
            ) : null}
        </View>
    );

    return (
        <GestureHandlerRootView style={styles.fill}>
            <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
                {/* 1. Header: back to the challenge, and whose submission this is */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
                        <Ionicons name="chevron-back" size={28} color={colors.text} />
                    </Pressable>
                    {submission && <Text style={styles.headerTitle} numberOfLines={1}>@{submission.username}</Text>}
                </View>

                {/* 2. Body: spinner, error, or the submission with its comments */}
                {isLoading ? (
                    <ActivityIndicator style={styles.fill} color={colors.active} />
                ) : errorMessage ? (
                    <View style={styles.centered}><Text style={styles.message}>{errorMessage}</Text></View>
                ) : (
                    <View style={styles.fill} onLayout={({nativeEvent: {layout}}) => setListHeight(layout.height)}>
                    {listHeight > 0 && <FlatList
                        data={comments}
                        keyExtractor={(comment) => comment.id}
                        scrollEnabled={!isZoomed}
                        ListHeaderComponent={media}
                        ListFooterComponent={footer}
                        contentContainerStyle={styles.content}
                        // Fetch the next page when the user is within half a screen of the bottom
                        onEndReached={loadMoreComments}
                        onEndReachedThreshold={0.5}
                        renderItem={({item}) => (
                            <View style={styles.comment}>
                                <View style={styles.commentTop}>
                                    <Text style={styles.username} numberOfLines={1}>@{item.username}</Text>
                                    <Text style={styles.date}>{formatDate(item.createdAt)}{item.editedAt ? ' · edited' : ''}</Text>
                                </View>
                                <Text style={styles.body}>{item.body}</Text>
                            </View>
                        )}
                    />}
                    </View>
                )}
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    fill: {flex: 1},
    safe: {flex: 1, backgroundColor: '#FFFFFF'},
    header: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8},
    headerTitle: {flex: 1, fontSize: 18, fontWeight: '600', color: theme.colors.text},
    centered: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24},
    content: {paddingBottom: 32},
    headingRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4},
    heading: {fontSize: 20, fontWeight: '700', color: theme.colors.text},
    // Same look and size as the badge on the grid's tiles (see PhotoGrid)
    voteBadge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: 'rgba(0, 0, 0, 0.55)'},
    voteText: {fontSize: 13, fontWeight: '600', color: '#FFFFFF'},
    comment: {paddingHorizontal: 20, paddingVertical: 12, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.tabBarBorder},
    commentTop: {flexDirection: 'row', alignItems: 'baseline', gap: 8},
    username: {flexShrink: 1, fontSize: 15, fontWeight: '700', color: theme.colors.text},
    date: {fontSize: 13, color: theme.colors.inactive},
    body: {fontSize: 15, lineHeight: 21, color: theme.colors.text},
    status: {alignItems: 'center', paddingVertical: 16, gap: 8},
    message: {color: theme.colors.inactive, fontSize: 15},
    retry: {minHeight: 44, justifyContent: 'center', paddingHorizontal: 16},
    link: {color: theme.colors.active, fontSize: 16, fontWeight: '600'},
});
