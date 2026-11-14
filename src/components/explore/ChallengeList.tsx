import {ActivityIndicator, FlatList, Pressable, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {ChallengeLocation} from '@/constants/types';
import {challengeListStyles as styles} from '@/constants/styles';
import {theme} from '@/constants/theme';

type Props = {
    challenges: ChallengeLocation[];
    isLoading: boolean;
    errorMessage: string | null;
    onRetry: () => void;
    searchQuery: string;
    hasDateFilter?: boolean;
};

export default function ChallengeList({challenges, isLoading, errorMessage, onRetry, searchQuery, hasDateFilter = false}: Props) {
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
            contentContainerStyle={[styles.content, {paddingTop: (searchQuery.trim() ? 140 : 80) + insets.top}]}   // leaves room for the floating search bar below the status bar
            data={challenges}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            keyExtractor={(challenge) => challenge.id}
            ListEmptyComponent={
                <View style={styles.centered}>
                    <Text style={styles.title}>{searchQuery.trim() || hasDateFilter ? 'No matching challenges' : 'No challenges yet'}</Text>
                    <Text style={styles.message}>
                        {searchQuery.trim() || hasDateFilter
                            ? 'Try a different search or reset your filters.'
                            : 'Switch to Map and hold a spot to create the first challenge.'}
                    </Text>
                </View>
            }
            renderItem={({item}) => (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View challenge: ${item.title}`}
                    onPress={() => router.push({pathname: '/challenge/[id]', params: {id: item.id}})}
                    style={({pressed}) => [styles.card, pressed && styles.pressed]}
                >
                    <View style={styles.cardBody}>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.description} numberOfLines={3}>{item.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={22} color={theme.colors.inactive} />
                </Pressable>
            )}
        />
    );
}
