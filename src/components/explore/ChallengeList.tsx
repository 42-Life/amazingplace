import {useState} from 'react';
import {ActivityIndicator, FlatList, Pressable, Text, View, Modal} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {ChallengeLocation, ChallengeSort} from '@/constants/types';
import {challengeListStyles as styles, sortStyles} from '@/constants/styles';
import {theme} from '@/constants/theme';
import type {ReactNode} from 'react';
import ChallengeTagPills from '@/components/ChallengeTagPill';
import { CHALLENGE_SORT_OPTIONS, sortTitle } from '@/lib/challenge-sort';

type ChallengeListItem = Pick<ChallengeLocation, 'id' | 'title' | 'description' | 'tags'>;


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

    // Sorting
    sort: ChallengeSort | null;
    onSortChange: (sort: ChallengeSort | null) => void;
};


export default function ChallengeList<T extends ChallengeListItem>(
    {challenges, isLoading, errorMessage, onRetry, searchQuery, hasDateFilter = false,
        emptyTitle, emptyMessage, layout = 'cards', renderDetails,
        sort, onSortChange
    }: Props<T>) {
    const insets = useSafeAreaInsets();   // status bar height

    // Controls whether the sort options are visible.
    const [sortVisible, setSortVisible] = useState(false);

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
        <View style={styles.fill}>
            <FlatList
                style={styles.fill}
                contentContainerStyle={[styles.content, layout === 'rows' && styles.rowsContent, {paddingTop: (layout === 'rows' ? 20 : searchQuery.trim() ? 140 : 80) + insets.top}]}   // card layout leaves room for Explore's floating search controls
                data={challenges}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                keyExtractor={(challenge) => challenge.id}
                ItemSeparatorComponent={layout === 'rows' ? () => <View style={styles.separator} /> : undefined}
                // Sorting
                ListHeaderComponent={
                    challenges.length > 0 ? (
                        <View style={sortStyles.container}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={sort ? sortTitle(sort) : 'Sort By'}
                                accessibilityState={{expanded: sortVisible}}
                                onPress={() => setSortVisible(true)}
                                style={({pressed}) => [
                                    sortStyles.dropdown,
                                    pressed && styles.pressed,
                                ]}
                            >
                                <Text
                                    style={[
                                        sortStyles.dropdownText,
                                        sort && sortStyles.activeText,
                                    ]}
                                    numberOfLines={1}
                                >
                                    {sort ? sortTitle(sort) : 'Sort By...'}
                                </Text>

                                {sort ? (
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel="Clear sorting"
                                        hitSlop={10}
                                        onPress={(event) => {
                                            event.stopPropagation();
                                            onSortChange(null);
                                        }}
                                    >
                                        <Ionicons
                                            name="close"
                                            size={22}
                                            color={theme.colors.text}
                                        />
                                    </Pressable>
                                ) : (
                                    <Ionicons
                                        name="chevron-forward"
                                        size={20}
                                        color={theme.colors.inactive}
                                    />
                                )}
                            </Pressable>
                        </View>
                    ):
                        <></> // if no challenges, show nothing for the sort
                }
                // Rows: one more divider under the last challenge, so every challenge has one below it
                ListFooterComponent={layout === 'rows' && challenges.length > 0 ? <View style={styles.separator} /> : undefined}
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
                renderItem={({item: challenge}) => (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`View challenge: ${challenge.title}`}
                        onPress={() => router.push({pathname: '/challenge/[id]', params: {id: challenge.id}})}
                        style={({pressed}) => [layout === 'rows' ? styles.row : styles.card, pressed && styles.pressed]}
                    >
                        {/* Title & Desctiption*/}
                        <View style={styles.cardBody}>
                            {/* Rows show the arrow on the title line; cards show it centered on the right (below) */}
                            <View style={styles.titleRow}>
                                <Text style={[styles.title, styles.titleText]}>{challenge.title}</Text>
                                {layout === 'rows' && <Ionicons name="chevron-forward" size={22} color={theme.colors.inactive} />}
                            </View>
                            <Text style={[styles.description, layout === 'rows' && styles.rowDescription]} numberOfLines={layout === 'rows' ? 2 : 3} ellipsizeMode="tail">{challenge.description}</Text>
                            {renderDetails?.(challenge)}
                            {/* Challenge tags*/}
                            <ChallengeTagPills
                                tags={challenge.tags}
                                compact
                            />
                        </View>



                        {layout === 'cards' && <Ionicons name="chevron-forward" size={22} color={theme.colors.inactive} />}
                    </Pressable>
                )}
            />

            <Modal
                visible={sortVisible && challenges.length > 0}
                transparent
                animationType="fade"
                onRequestClose={() => setSortVisible(false)}
            >
                <Pressable
                    style={sortStyles.modalOverlay}
                    onPress={() => setSortVisible(false)}
                >
                    <View style={sortStyles.modalContent}>
                        <View style={sortStyles.modalHeader}>
                            <Text style={sortStyles.modalTitle}>
                                Sort challenges
                            </Text>

                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Close sort options"
                                onPress={() => setSortVisible(false)}
                            >
                                <Ionicons
                                    name="close"
                                    size={24}
                                    color={theme.colors.text}
                                />
                            </Pressable>
                        </View>

                        {CHALLENGE_SORT_OPTIONS.map((option) => {
                            const isSelected =
                                sort?.field === option.field &&
                                sort?.direction === option.direction;

                            return (
                                <Pressable
                                    key={`${option.field}-${option.direction}`}
                                    accessibilityRole="button"
                                    accessibilityState={{selected: isSelected}}
                                    onPress={() => {
                                        onSortChange({
                                            field: option.field,
                                            direction: option.direction,
                                        });
                                        setSortVisible(false);
                                    }}
                                    style={({pressed}) => [
                                        sortStyles.option,
                                        isSelected && sortStyles.selectedOption,
                                        pressed && styles.pressed,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            sortStyles.optionText,
                                            isSelected && sortStyles.selectedOptionText,
                                        ]}
                                    >
                                        {option.fieldLabel} ({option.directionLabel})
                                    </Text>

                                    {isSelected && (
                                        <Ionicons
                                            name="checkmark"
                                            size={20}
                                            color={theme.colors.active}
                                        />
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}
