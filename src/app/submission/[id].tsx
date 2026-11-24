// SUBMISSION SCREEN
// One submission on its own page: the photo (or video) filling the screen at the top,
// and its comments underneath. Opened by tapping a submission on a challenge page.
//
// The photo can be pinched to zoom, and double-tapped to vote. Comments load a page at a time,
// with more fetched as the user nears the bottom, so the list can go on as long as it needs to.
// The box pinned to the bottom writes a new comment, or edits one of the user's own.

// KEY IMPORTS
import {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Ionicons} from '@expo/vector-icons';
import {router, useLocalSearchParams} from 'expo-router';
// Internal imports
import CommentComposer from '@/components/comments/CommentComposer';
import CommentItem from '@/components/comments/CommentItem';
import ZoomableImage from '@/components/capture/ZoomableImage';
import SubmissionVideo from '@/components/capture/SubmissionVideo';
import {theme} from '@/constants/theme';
import type {Comment} from '@/constants/types';
import {createComment, deleteComment, fetchCommentsPage, updateComment} from '@/lib/comments';
import {fetchSubmissionById, type SubmissionDetail} from '@/lib/photos';
import {fetchChallengeVotes, removeVote, submitVote, updateVote, type ChallengeVotes} from '@/lib/voting';
import {getVotingClosedMessage} from '@/utils/challenge-dates';

// How many comments each trip to the database brings back
const COMMENTS_PER_PAGE = 20;

// Where the comment list stands
//   idle: more may exist, waiting for the user to scroll   loading: fetching a page
//   done: every comment is on screen                       error: the last fetch failed
type CommentsStatus = 'idle' | 'loading' | 'done' | 'error';

// Oldest first, the order the database pages them in. Sorting here keeps a comment the user
// just posted in its place when older pages are loaded in after it.
const byAge = (a: Comment, b: Comment) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);


// MAIN FUNCTION
export default function SubmissionScreen() {
    const {colors} = theme;
    const {width, height: windowHeight} = useWindowDimensions();
    const insets = useSafeAreaInsets();

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
    // Comments posted from this screen that paging hasn't reached yet (see removeComment)
    const postedHere = useRef(new Set<string>());
    const listRef = useRef<FlatList<Comment>>(null);

    // The comment open in the composer for editing, and the ones being deleted right now
    const [editing, setEditing] = useState<Comment | null>(null);
    const [deletingIds, setDeletingIds] = useState<string[]>([]);

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
        // Outside the voting period the database refuses votes (see challenge_phase); say why instead of trying
        const closedMessage = getVotingClosedMessage(submission.challengeSchedule);
        if (closedMessage) {
            Alert.alert('Voting isn’t open', closedMessage);
            return;
        }
        // The database refuses this too (see prevent_self_vote); checking here just saves the round trip
        if (submission.isOwn) {
            Alert.alert('Could not vote', 'You can’t vote for your own submission.');
            return;
        }
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
        // Votes are final once voting closes
        const closedMessage = getVotingClosedMessage(submission.challengeSchedule);
        if (closedMessage) {
            Alert.alert('Voting isn’t open', `${closedMessage} Votes can no longer be changed.`);
            return;
        }
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
            // Paging has now reached these, so they count as loaded like any other
            page.forEach((comment) => postedHere.current.delete(comment.id));
            // Skip any comment already on screen (one the user just posted, for example)
            setComments((current) => {
                const seen = new Set(current.map((comment) => comment.id));
                return [...current, ...page.filter((comment) => !seen.has(comment.id))].sort(byAge);
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

    // KEY HANDLER: THE COMPOSER'S BUTTON
    //   Saves an edit if a comment is open for editing, otherwise posts a new comment.
    //   Errors are left to throw: the composer shows them and keeps the text.
    async function submitComment(text: string) {
        if (editing) {
            const updated = await updateComment(editing.id, text);
            setComments((current) => current.map((comment) => comment.id === updated.id ? updated : comment));
            setEditing(null);
            return;
        }
        const created = await createComment(id, text);
        // If older pages are still to come, paging hasn't counted this one yet
        if (hasMoreComments.current) postedHere.current.add(created.id);
        setComments((current) => [...current, created].sort(byAge));
        // Show the user their comment: it is the newest, so it is at the bottom
        setTimeout(() => listRef.current?.scrollToEnd({animated: true}), 100);
    }

    // KEY HANDLER: DELETE BUTTON ON A COMMENT
    //   Asks first, because a deleted comment can't be brought back.
    function confirmDeleteComment(comment: Comment) {
        Alert.alert('Delete comment?', 'This can’t be undone.', [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Delete', style: 'destructive', onPress: () => removeComment(comment)},
        ]);
    }

    async function removeComment(comment: Comment) {
        setDeletingIds((current) => [...current, comment.id]);
        try {
            await deleteComment(comment.id);
            setComments((current) => current.filter((item) => item.id !== comment.id));
            if (editing?.id === comment.id) setEditing(null);
            // One fewer row in the database means the next page starts one row earlier,
            // unless this comment was never counted as loaded in the first place
            if (!postedHere.current.delete(comment.id)) loadedCount.current = Math.max(loadedCount.current - 1, 0);
        } catch (err: any) {
            Alert.alert('Could not delete comment', err?.message ?? 'Something went wrong. Please try again.');
        } finally {
            setDeletingIds((current) => current.filter((item) => item !== comment.id));
        }
    }

    // TOP OF THE LIST: the photo or video, then the "Comments" heading
    //   Photos get a stage as tall as the page, like the old full-screen viewer.
    //   Videos get a box no taller than 60% of the screen, so the comments stay within reach
    const isVideo = submission?.mediaType === 'video';
    const mediaHeight = isVideo ? Math.min(width * 4 / 3, windowHeight * 0.6) : listHeight;
    const media = submission ? (
        <View>
            {isVideo
                ? <SubmissionVideo videoUrl={submission.imageUrl} width={width} height={mediaHeight} />
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
                    // Lifts the composer above the keyboard (iOS; Android resizes the window itself)
                    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    {/* Only ever grows: the keyboard shrinks this area, and the photo's stage must not shrink with it */}
                    <View style={styles.fill} onLayout={({nativeEvent: {layout}}) => setListHeight((current) => Math.max(current, layout.height))}>
                    {listHeight > 0 && <FlatList
                        ref={listRef}
                        data={comments}
                        // Scrolling puts the keyboard away; tapping Edit or Delete works while it is up
                        keyboardDismissMode="on-drag"
                        keyboardShouldPersistTaps="handled"
                        keyExtractor={(comment) => comment.id}
                        scrollEnabled={!isZoomed}
                        ListHeaderComponent={media}
                        ListFooterComponent={footer}
                        // The comments section is always at least half a screen tall, however few
                        // comments there are, so scrolling down always opens up some room for them.
                        contentContainerStyle={[styles.content, {minHeight: mediaHeight + listHeight / 2}]}
                        // Fetch the next page when the user is within half a screen of the bottom
                        onEndReached={loadMoreComments}
                        onEndReachedThreshold={0.5}
                        renderItem={({item}) => (
                            <CommentItem
                                comment={item}
                                isEditing={editing?.id === item.id}
                                isDeleting={deletingIds.includes(item.id)}
                                onEdit={setEditing}
                                onDelete={confirmDeleteComment}
                            />
                        )}
                    />}
                    </View>
                    {/* 3. Composer: pinned under the list. A new key resets its text box when edit mode changes */}
                    <CommentComposer
                        key={editing?.id ?? 'new'}
                        editing={editing}
                        onSubmit={submitComment}
                        onCancelEdit={() => setEditing(null)}
                        bottomInset={insets.bottom}
                    />
                    </KeyboardAvoidingView>
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
    status: {alignItems: 'center', paddingVertical: 16, gap: 8},
    message: {color: theme.colors.inactive, fontSize: 15},
    retry: {minHeight: 44, justifyContent: 'center', paddingHorizontal: 16},
    link: {color: theme.colors.active, fontSize: 16, fontWeight: '600'},
});
