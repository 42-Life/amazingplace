import {useEffect, useRef, useState, type ReactElement} from 'react';
import {ActivityIndicator, Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import {fetchChallengeSubmissions, type SubmissionPhoto} from '@/lib/photos';
import {fetchChallengeVotes, removeVote, submitVote, updateVote, type ChallengeVotes} from '@/lib/voting';
import {theme} from '@/constants/theme';
import PhotoGrid, {type GridPhoto} from './PhotoGrid';
import ImageViewer from './ImageViewer';
import VideoViewer from './VideoViewer';

type Props = {
    challengeId: string;
    // voteCount is null while loading or if the votes couldn't be loaded
    header: (submissionCount: number | null, voteCount: number | null) => ReactElement;
};

export default function ChallengeSubmissionsGrid({challengeId, header}: Props) {
    const [photos, setPhotos] = useState<SubmissionPhoto[]>([]);
    const [submissionCount, setSubmissionCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [revision, setRevision] = useState(0);
    const [selected, setSelected] = useState<GridPhoto | null>(null);
    const [votes, setVotes] = useState<ChallengeVotes | null>(null);   // null until loaded
    const isVoting = useRef(false);                                     // blocks a second vote while one is saving

    useEffect(() => {
        let active = true;
        fetchChallengeSubmissions(challengeId)
            .then((data) => {
                if (!active) return;
                setPhotos(data.photos);
                setSubmissionCount(data.total);
            })
            .catch(() => {if (active) setError(true);})
            .finally(() => {if (active) setLoading(false);});
        // Votes load on their own, so a votes failure doesn't hide the submissions
        fetchChallengeVotes(challengeId)
            .then((data) => {if (active) setVotes(data);})
            .catch((err) => console.error('Could not load votes:', err));
        return () => {active = false;};
    }, [challengeId, revision]);

    function refresh() {
        setLoading(true);
        setError(false);
        setRevision((value) => value + 1);
    }

    // KEY HANDLER: DOUBLE TAP TO VOTE
    //   No vote yet: cast one. Voted for another photo: move the vote here. Voted for this one: take it back.
    async function vote(photo: GridPhoto) {
        if (!votes || isVoting.current) return;
        isVoting.current = true;
        const previous = votes.mySubmissionId;
        try {
            // Already voted for this photo: remove the vote
            if (previous === photo.id) {
                await removeVote(challengeId);
                setVotes((current) => {
                    if (!current) return current;
                    const counts = {...current.counts, [photo.id]: Math.max((current.counts[photo.id] ?? 1) - 1, 0)};
                    return {counts, total: Math.max(current.total - 1, 0), mySubmissionId: null};
                });
                return;
            }

            if (previous) await updateVote(challengeId, photo.id);
            else await submitVote(challengeId, photo.id);

            // Saved: update the counts here instead of reloading everything
            setVotes((current) => {
                if (!current) return current;
                const counts = {...current.counts, [photo.id]: (current.counts[photo.id] ?? 0) + 1};
                if (previous) counts[previous] = Math.max((counts[previous] ?? 1) - 1, 0);
                return {counts, total: previous ? current.total : current.total + 1, mySubmissionId: photo.id};
            });
        } catch (err: any) {
            Alert.alert('Could not vote', err?.message ?? 'Something went wrong. Please try again.');
        } finally {
            isVoting.current = false;
        }
    }

    return (
        <>
            <PhotoGrid
                photos={photos}
                onPhotoPress={setSelected}
                onPhotoDoublePress={vote}
                voteCounts={votes?.counts}
                refreshing={loading}
                onRefresh={refresh}
                header={<View style={styles.header}>{header(submissionCount, votes?.total ?? null)}<Text style={styles.title}>Submissions</Text></View>}
                footer={
                    <View style={styles.status}>
                        {loading ? <ActivityIndicator color={theme.colors.active} accessibilityLabel="Loading submissions" />
                            : error ? <>
                                <Text style={styles.message}>Could not load submissions.</Text>
                                <Pressable onPress={refresh} accessibilityRole="button" style={styles.retry}>
                                    <Text style={styles.link}>Try again</Text>
                                </Pressable>
                            </> : photos.length === 0 ? <Text style={styles.message}>No entries yet. Be the first to enter!</Text> : null}
                    </View>
                }
            />
            {selected && (selected.mediaType === 'video'
                ? <VideoViewer key={selected.id} videoUrl={selected.imageUrl} onClose={() => setSelected(null)} />
                : <ImageViewer key={selected.id} imageUrl={selected.imageUrl} onClose={() => setSelected(null)} />)}
        </>
    );
}

const styles = StyleSheet.create({
    header: {gap: 20, paddingBottom: 12},
    title: {fontSize: 20, fontWeight: '700', color: theme.colors.text},
    status: {alignItems: 'center', paddingVertical: 12, gap: 8},
    message: {color: theme.colors.inactive, fontSize: 15},
    retry: {minHeight: 44, justifyContent: 'center', paddingHorizontal: 16},
    link: {color: theme.colors.active, fontSize: 16, fontWeight: '600'},
});
