import type {ReactElement} from 'react';
import {FlatList, Pressable, StyleSheet} from 'react-native';
import {Image} from 'expo-image';

export type GridPhoto = {id: string; imageUrl: string};

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
        <FlatList
            style={styles.list}
            data={photos}
            numColumns={2}
            keyExtractor={(photo) => photo.id}
            contentContainerStyle={styles.content}
            columnWrapperStyle={styles.row}
            ListHeaderComponent={header}
            ListFooterComponent={footer}
            refreshing={refreshing}
            onRefresh={onRefresh}
            renderItem={({item, index}) => (
                <Pressable
                    style={styles.tile}
                    onPress={() => onPhotoPress(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open submission photo ${index + 1}`}
                >
                    <Image source={{uri: item.imageUrl}} recyclingKey={item.id} style={styles.image} contentFit="cover" />
                </Pressable>
            )}
        />
    );
}

const styles = StyleSheet.create({
    list: {flex: 1},
    content: {padding: 20},
    row: {justifyContent: 'space-between', marginBottom: 8},
    tile: {width: '48.5%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#E5E7EB'},
    image: {width: '100%', height: '100%'},
});
