import type {ReactElement} from 'react';
import {Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Image} from 'expo-image';
import {theme} from '@/constants/theme';
import type {MediaType} from '@/constants/types';
import VideoTile from './VideoTile';

// One submission in the grid. imageUrl is the file's link, for videos too.
export type GridPhoto = {id: string; imageUrl: string; mediaType: MediaType; durationMs: number | null; username: string; isOwn: boolean};

type Props = {
    photos: GridPhoto[];
    onPhotoPress: (photo: GridPhoto) => void;
    header?: ReactElement;
    footer?: ReactElement;
    refreshing?: boolean;
    onRefresh?: () => void;
};

export default function PhotoGrid({photos, onPhotoPress, header, footer, refreshing, onRefresh}: Props) {
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
                        {photos.filter((_, index) => index % 2 === column).map((photo) => (
                            <Pressable
                                key={photo.id}
                                style={styles.tile}
                                onPress={() => onPhotoPress(photo)}
                                accessibilityRole="button"
                                accessibilityLabel={`${photo.mediaType === 'video' ? 'Play' : 'Open'} ${photo.isOwn ? 'your submission' : `submission by @${photo.username}`}`}
                            >
                                {/* Videos show a play tile instead of loading the video (see VideoTile) */}
                                {photo.mediaType === 'video'
                                    ? <VideoTile durationMs={photo.durationMs} style={styles.image} />
                                    : <Image source={{uri: photo.imageUrl}} recyclingKey={photo.id} style={styles.image} contentFit="cover" />}
                                <Text style={styles.username} numberOfLines={2} ellipsizeMode="tail">
                                    {photo.isOwn ? 'Your submission' : `@${photo.username}`}
                                </Text>
                            </Pressable>
                        ))}
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
    username: {fontSize: 14, lineHeight: 20, color: theme.colors.inactive},
});
