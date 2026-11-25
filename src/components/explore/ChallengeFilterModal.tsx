import DateSelector from '@/components/explore/DateSelector';
import { challengeFilterStyles } from '@/constants/styles';
import { theme } from '@/constants/theme';
import {
    DISTANCE_OPTIONS_MILES,
    NO_FILTERS,
    type ChallengeFilters,
    type MediaTypeFilter,
} from '@/lib/challenge-filters';
import { isValidChallengeDate } from '@/utils/challenge-dates';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChallengeTagPicker from '@/components/ChallengeTagPicker';
import type { ChallengeTagId } from '@/constants/types';

type Props = {
    filters: ChallengeFilters;
    canFilterByDistance: boolean;   // false until we know where the user is
    onApply: (filters: ChallengeFilters) => void;
    onClose: () => void;
};

const MEDIA_OPTIONS: {value: MediaTypeFilter; label: string}[] = [
    {value: 'any', label: 'Any'},
    {value: 'photo', label: 'Photo'},
    {value: 'video', label: 'Video'},
];

function Chip({label, selected, disabled, onPress}: {label: string; selected: boolean; disabled?: boolean; onPress: () => void}) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{selected, disabled: !!disabled}}
            disabled={disabled}
            onPress={onPress}
            style={[challengeFilterStyles.chip, selected && challengeFilterStyles.chipSelected, disabled && challengeFilterStyles.chipDisabled]}
        >
            <Text style={[challengeFilterStyles.chipText, selected && challengeFilterStyles.chipTextSelected]}>{label}</Text>
        </Pressable>
    );
}

export default function ChallengeFilterModal({filters, canFilterByDistance, onApply, onClose}: Props) {
    const [from, setFrom] = useState(filters.from);
    const [through, setThrough] = useState(filters.through);
    const [mediaType, setMediaType] = useState<MediaTypeFilter>(filters.mediaType);
    const [maxDistanceMiles, setMaxDistanceMiles] = useState<number | null>(filters.maxDistanceMiles);
    const [error, setError] = useState<string | null>(null);
    const [tags, setTags] = useState<ChallengeTagId[]>(
        filters.tags ?? []
    );

    const apply = () => {
        const range = {from: from.trim(), through: through.trim()};
        if ([range.from, range.through].some((date) => date && !isValidChallengeDate(date))) {
            setError('Select valid dates.');
            return;
        }
        if (range.from && range.through && range.from > range.through) {
            setError('From must be on or before Through.');
            return;
        }
        onApply({...range,
            mediaType,
            maxDistanceMiles: canFilterByDistance ? maxDistanceMiles : null,
            tags,
        });
    };

    return (
        <Modal transparent animationType="fade" visible onRequestClose={onClose}>
            <View style={challengeFilterStyles.backdrop}>
                <SafeAreaView style={challengeFilterStyles.safe} pointerEvents="box-none">
                    <ScrollView contentContainerStyle={challengeFilterStyles.container} keyboardShouldPersistTaps="handled">
                        <Pressable
                            style={challengeFilterStyles.dismissArea}
                            accessibilityRole="button"
                            accessibilityLabel="Close filters"
                            onPress={onClose}
                        />
                        <View style={challengeFilterStyles.sheet} accessibilityViewIsModal>
                            <View style={challengeFilterStyles.header}>
                                <Text style={challengeFilterStyles.title} accessibilityRole="header">Filter challenges</Text>
                                <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose} style={challengeFilterStyles.close}>
                                    <Ionicons name="close-outline" size={26} color={theme.colors.text} />
                                </Pressable>
                            </View>

                            {/* Date Picker Filter*/}
                            <Text style={challengeFilterStyles.fieldLabel}>Start date from</Text>
                            <DateSelector
                                label="Competition start date from"
                                value={from}
                                maximumDate={through || undefined}
                                onChange={(value) => {setFrom(value); setError(null);}}
                            />
                            <Text style={challengeFilterStyles.fieldLabel}>Start date through</Text>
                            <DateSelector
                                label="Competition start date through"
                                value={through}
                                minimumDate={from || undefined}
                                onChange={(value) => {setThrough(value); setError(null);}}
                            />

                            {/* Tags */}
                            <Text style={challengeFilterStyles.label}>Categories</Text>

                            <ChallengeTagPicker
                                value={tags}
                                onChange={setTags}
                                maxSelections={12}
                            />

                            <Text style={challengeFilterStyles.fieldLabel}>Submission type</Text>
                            <View style={challengeFilterStyles.chipRow}>
                                {MEDIA_OPTIONS.map((option) => (
                                    <Chip
                                        key={option.value}
                                        label={option.label}
                                        selected={mediaType === option.value}
                                        onPress={() => setMediaType(option.value)}
                                    />
                                ))}
                            </View>

                            <Text style={challengeFilterStyles.fieldLabel}>Distance from Me</Text>
                            <View style={challengeFilterStyles.chipRow}>
                                <Chip
                                    label="Any"
                                    selected={maxDistanceMiles === null}
                                    disabled={!canFilterByDistance}
                                    onPress={() => setMaxDistanceMiles(null)}
                                />
                                {DISTANCE_OPTIONS_MILES.map((miles) => (
                                    <Chip
                                        key={miles}
                                        label={`${miles} mi`}
                                        selected={maxDistanceMiles === miles}
                                        disabled={!canFilterByDistance}
                                        onPress={() => setMaxDistanceMiles(miles)}
                                    />
                                ))}
                            </View>
                            {!canFilterByDistance && (
                                <Text style={challengeFilterStyles.hint}>Turn on location access to filter by distance.</Text>
                            )}

                            {error && <Text style={challengeFilterStyles.error} accessibilityRole="alert">{error}</Text>}
                            <View style={challengeFilterStyles.actions}>
                                <Pressable accessibilityRole="button" onPress={() => onApply(NO_FILTERS)} style={challengeFilterStyles.reset}>
                                    <Text style={challengeFilterStyles.resetText}>Reset filters</Text>
                                </Pressable>
                                <Pressable accessibilityRole="button" onPress={apply} style={challengeFilterStyles.apply}>
                                    <Text style={challengeFilterStyles.applyText}>Apply filters</Text>
                                </Pressable>
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </View>
        </Modal>
    );
}