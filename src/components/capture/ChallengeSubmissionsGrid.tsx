import {useEffect, useState, type ReactElement} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {fetchChallengeSubmissions, type SubmissionPhoto} from '@/lib/photos';
import {theme} from '@/constants/theme';
import PhotoGrid, {type GridPhoto} from './PhotoGrid';
import ImageViewer from './ImageViewer';

export default function ChallengeSubmissionsGrid({challengeId, header}: {challengeId: string; header: ReactElement}) {
    const [photos, setPhotos] = useState<SubmissionPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [revision, setRevision] = useState(0);
    const [selected, setSelected] = useState<GridPhoto | null>(null);

    useEffect(() => {
        let active = true;
        fetchChallengeSubmissions(challengeId)
            .then((data) => {if (active) setPhotos(data);})
            .catch(() => {if (active) setError(true);})
            .finally(() => {if (active) setLoading(false);});
        return () => {active = false;};
    }, [challengeId, revision]);

    function refresh() {
        setLoading(true);
        setError(false);
        setRevision((value) => value + 1);
    }

    return (
        <>
            <PhotoGrid
                photos={photos}
                onPhotoPress={setSelected}
                refreshing={loading}
                onRefresh={refresh}
                header={<View style={styles.header}>{header}<Text style={styles.title}>Submissions</Text></View>}
                footer={
                    <View style={styles.status}>
                        {loading ? <ActivityIndicator color={theme.colors.active} accessibilityLabel="Loading submissions" />
                            : error ? <>
                                <Text style={styles.message}>Could not load submissions.</Text>
                                <Pressable onPress={refresh} accessibilityRole="button" style={styles.retry}>
                                    <Text style={styles.link}>Try again</Text>
                                </Pressable>
                            </> : photos.length === 0 ? <Text style={styles.message}>No photos yet. Be the first to enter!</Text> : null}
                    </View>
                }
            />
            {selected && <ImageViewer key={selected.id} imageUrl={selected.imageUrl} onClose={() => setSelected(null)} />}
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
