import {useEffect, useRef, type ReactElement} from 'react';
import {Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Image} from 'expo-image';
import {theme} from '@/constants/theme';
import type {MediaType} from '@/constants/types';
import VideoTile from './VideoTile';

// One submission in the grid. imageUrl is the file's link, for videos too.
export type GridPhoto = {id: string; imageUrl: string; mediaType: MediaType; durationMs: number | null; username: string; isOwn: boolean};

// Two taps on the same tile within this many milliseconds count as a double tap
const DOUBLE_TAP_MS = 250;

type Props = {
    photos: GridPhoto[];
    onPhotoPress: (photo: GridPhoto) => void;
    onPhotoDoublePress?: (photo: GridPhoto) => void;   // when given, single taps wait briefly to see if a second tap follows
    voteCounts?: Record<string, number>;              // photo id -> votes; a heart shows on tiles with at least one
    header?: ReactElement;
    footer?: ReactElement;
    refreshing?: boolean;
    onRefresh?: () => void;
};

export default function PhotoGrid({photos, onPhotoPress, onPhotoDoublePress, voteCounts, header, footer, refreshing, onRefresh}: Props) {
    // The first tap of a possible double tap: which photo, and the timer that opens it if no second tap comes
    const pendingTap = useRef<{id: string; timer: ReturnType<typeof setTimeout>} | null>(null);

    // Don't open a photo after the grid has gone away
    useEffect(() => () => {
        if (pendingTap.current) clearTimeout(pendingTap.current.timer);
    }, []);

    function handlePress(photo: GridPhoto) {
        if (!onPhotoDoublePress) return onPhotoPress(photo);

        // Second tap on the same photo: it's a double tap, so cancel the single-tap open
        if (pendingTap.current?.id === photo.id) {
            clearTimeout(pendingTap.current.timer);
            pendingTap.current = null;
            onPhotoDoublePress(photo);
            return;
        }

        // First tap: open the photo unless a second tap arrives in time
        if (pendingTap.current) clearTimeout(pendingTap.current.timer);
        pendingTap.current = {
            id: photo.id,
            timer: setTimeout(() => {
                pendingTap.current = null;
                onPhotoPress(photo);
            }, DOUBLE_TAP_MS),
        };
    }

    return (
        <ScrollView
            style={styles.list}
            contentContainerStyle={styles.content}
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} /> : undefined}
        >
            {header}
            <View style={styles.columns}>
                {[0, 1].map((column) => (
                    <View key={column} style={styles.column}>
                        {photos.filter((_, index) => index % 2 === column).map((photo) => {
                            const votes = voteCounts?.[photo.id] ?? 0;
                            return (
                                <Pressable
                                    key={photo.id}
                                    style={styles.tile}
                                    onPress={() => handlePress(photo)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${photo.mediaType === 'video' ? 'Play' : 'Open'} ${photo.isOwn ? 'your submission' : `submission by @${photo.username}`}${votes > 0 ? `, ${votes} ${votes === 1 ? 'vote' : 'votes'}` : ''}`}
                                    accessibilityHint={onPhotoDoublePress ? 'Tap twice quickly to vote' : undefined}
                                >
                                    <View>
                                        {/* Videos show a play tile instead of loading the video (see VideoTile) */}
                                        {photo.mediaType === 'video'
                                            ? <VideoTile durationMs={photo.durationMs} style={styles.image} />
                                            : <Image source={{uri: photo.imageUrl}} recyclingKey={photo.id} style={styles.image} contentFit="cover" />}
                                        {/* Vote count, hidden until the photo has a vote */}
                                        {votes > 0 && (
                                            <View style={styles.voteBadge}>
                                                <Text style={styles.voteText}>❤️ {votes.toLocaleString()}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.username} numberOfLines={2} ellipsizeMode="tail">
                                        {photo.isOwn ? 'Your submission' : `@${photo.username}`}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                ))}
            </View>
            {footer}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    list: {flex: 1},
    content: {padding: 20},
    columns: {flexDirection: 'row', gap: 8, alignItems: 'flex-start'},
    column: {flex: 1, minWidth: 0, gap: 12},
    tile: {gap: 4},
    image: {width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: '#E5E7EB'},
    voteBadge: {position: 'absolute', right: 6, bottom: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: 'rgba(0, 0, 0, 0.55)'},
    voteText: {fontSize: 13, fontWeight: '600', color: '#FFFFFF'},
    username: {fontSize: 14, lineHeight: 20, color: theme.colors.inactive},
});
