// VIDEO TILE
// Stand-in for a video in the submission grids: a dark square with a play icon and the video's length.
// Grids don't load or play videos (many players at once are heavy); tapping a tile opens the submission page, which plays it.
// Real thumbnails could replace this later.

import {StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {formatDuration} from '@/utils/media';

type VideoTileProps = {
    durationMs: number | null,
    style?: StyleProp<ViewStyle>,   // the grid's tile size and corners, so it lines up with photo tiles
}

export default function VideoTile({durationMs, style}: VideoTileProps) {
    return (
        <View style={[style, styles.tile]}>
            <Ionicons name="play-circle" size={48} color="#FFFFFF" />
            {durationMs != null && (
                <View style={styles.badge}>
                    <Ionicons name="videocam" size={12} color="#FFFFFF" />
                    <Text style={styles.badgeText}>{formatDuration(durationMs / 1000)}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    tile: {backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
    badge: {
        position: 'absolute',
        right: 8,
        bottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    badgeText: {color: '#FFFFFF', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums']},
});
