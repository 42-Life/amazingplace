import {ActivityIndicator, FlatList, Pressable, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {ChallengeLocation} from '@/constants/types';
import {challengeListStyles as styles} from '@/constants/styles';
import {theme} from '@/constants/theme';
import type {ReactNode} from 'react';

type ChallengeListItem = Pick<ChallengeLocation, 'id' | 'title' | 'description'>;

type Props<T extends ChallengeListItem> = {
    challenges: T[];
    isLoading: boolean;
    errorMessage: string | null;
    onRetry: () => void;
    searchQuery: string;
    hasDateFilter?: boolean;
    emptyTitle?: string;
    emptyMessage?: string;
    layout?: 'cards' | 'rows';
    renderDetails?: (challenge: T) => ReactNode;
};

export default function ChallengeList<T extends ChallengeListItem>({challenges, isLoading, errorMessage, onRetry, searchQuery, hasDateFilter = false, emptyTitle, emptyMessage, layout = 'cards', renderDetails}: Props<T>) {
    const insets = useSafeAreaInsets();   // status bar height

    if (isLoading) {
        return <ActivityIndicator style={styles.centered} color={theme.colors.active} accessibilityLabel="Loading challenges" />;
    }

    if (errorMessage) {
        return (
            <View style={styles.centered}>
                <Text style={styles.message} accessibilityRole="alert">{errorMessage}</Text>
                <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}>
                    <Text style={styles.retryText}>Try again</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <FlatList
            style={styles.fill}
            contentContainerStyle={[styles.content, layout === 'rows' && styles.rowsContent, {paddingTop: (layout === 'rows' ? 20 : searchQuery.trim() ? 140 : 80) + insets.top}]}   // card layout leaves room for Explore's floating search controls
            data={challenges}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            keyExtractor={(challenge) => challenge.id}
            ItemSeparatorComponent={layout === 'rows' ? () => <View style={styles.separator} /> : undefined}
            ListEmptyComponent={
                <View style={styles.centered}>
                    <Text style={styles.title}>{emptyTitle ?? (searchQuery.trim() || hasDateFilter ? 'No matching challenges' : 'No challenges yet')}</Text>
                    <Text style={styles.message}>
                        {emptyMessage ?? (searchQuery.trim() || hasDateFilter
                            ? 'Try a different search or reset your filters.'
                            : 'Switch to Map and hold a spot to create the first challenge.')}
                    </Text>
                </View>
            }
            renderItem={({item}) => (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View challenge: ${item.title}`}
                    onPress={() => router.push({pathname: '/challenge/[id]', params: {id: item.id}})}
                    style={({pressed}) => [layout === 'rows' ? styles.row : styles.card, pressed && styles.pressed]}
                >
                    <View style={styles.cardBody}>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={[styles.description, layout === 'rows' && styles.rowDescription]} numberOfLines={layout === 'rows' ? 2 : 3} ellipsizeMode="tail">{item.description}</Text>
                        {renderDetails?.(item)}
                    </View>
                    {layout === 'cards' && <Ionicons name="chevron-forward" size={22} color={theme.colors.inactive} />}
                </Pressable>
            )}
        />
    );
}
