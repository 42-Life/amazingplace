import DateSelector from '@/components/explore/DateSelector';
import { challengeFilterStyles as styles } from '@/constants/styles';
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
            style={[styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled]}
        >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
        </Pressable>
    );
}

export default function ChallengeFilterModal({filters, canFilterByDistance, onApply, onClose}: Props) {
    const [from, setFrom] = useState(filters.from);
    const [through, setThrough] = useState(filters.through);
    const [mediaType, setMediaType] = useState<MediaTypeFilter>(filters.mediaType);
    const [maxDistanceMiles, setMaxDistanceMiles] = useState<number | null>(filters.maxDistanceMiles);
    const [error, setError] = useState<string | null>(null);

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
        onApply({...range, mediaType, maxDistanceMiles: canFilterByDistance ? maxDistanceMiles : null});
    };

    return (
        <Modal transparent animationType="fade" visible onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <SafeAreaView style={styles.safe} pointerEvents="box-none">
                    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                        <Pressable
                            style={styles.dismissArea}
                            accessibilityRole="button"
                            accessibilityLabel="Close filters"
                            onPress={onClose}
                        />
                        <View style={styles.sheet} accessibilityViewIsModal>
                            <View style={styles.header}>
                                <Text style={styles.title} accessibilityRole="header">Filter challenges</Text>
                                <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose} style={styles.close}>
                                    <Ionicons name="close-outline" size={26} color={theme.colors.text} />
                                </Pressable>
                            </View>

                            <Text style={styles.fieldLabel}>Start date from</Text>
                            <DateSelector
                                label="Competition start date from"
                                value={from}
                                maximumDate={through || undefined}
                                onChange={(value) => {setFrom(value); setError(null);}}
                            />
                            <Text style={styles.fieldLabel}>Start date through</Text>
                            <DateSelector
                                label="Competition start date through"
                                value={through}
                                minimumDate={from || undefined}
                                onChange={(value) => {setThrough(value); setError(null);}}
                            />

                            <Text style={styles.fieldLabel}>Submission type</Text>
                            <View style={styles.chipRow}>
                                {MEDIA_OPTIONS.map((option) => (
                                    <Chip
                                        key={option.value}
                                        label={option.label}
                                        selected={mediaType === option.value}
                                        onPress={() => setMediaType(option.value)}
                                    />
                                ))}
                            </View>

                            <Text style={styles.fieldLabel}>Distance from Me</Text>
                            <View style={styles.chipRow}>
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
                                <Text style={styles.hint}>Turn on location access to filter by distance.</Text>
                            )}

                            {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
                            <View style={styles.actions}>
                                <Pressable accessibilityRole="button" onPress={() => onApply(NO_FILTERS)} style={styles.reset}>
                                    <Text style={styles.resetText}>Reset filters</Text>
                                </Pressable>
                                <Pressable accessibilityRole="button" onPress={apply} style={styles.apply}>
                                    <Text style={styles.applyText}>Apply filters</Text>
                                </Pressable>
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </View>
        </Modal>
    );
}