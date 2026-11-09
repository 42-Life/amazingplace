import DateSelector from '@/components/explore/DateSelector';
import { challengeFilterStyles as styles } from '@/constants/styles';
import { theme } from '@/constants/theme';
import type { ChallengeStartDateFilter } from '@/lib/filter';
import { isValidChallengeDate } from '@/utils/challenge-dates';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
    filters: ChallengeStartDateFilter;
    onApply: (filters: ChallengeStartDateFilter) => void;
    onClose: () => void;
};

export default function ChallengeFilterModal({filters, onApply, onClose}: Props) {
    const [from, setFrom] = useState(filters.from);
    const [through, setThrough] = useState(filters.through);
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
        onApply(range);
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
                            <Text style={styles.fieldLabel}>From</Text>
                            <DateSelector
                                label="Competition start date from"
                                value={from}
                                maximumDate={through || undefined}
                                onChange={(value) => {setFrom(value); setError(null);}}
                            />
                            <Text style={styles.fieldLabel}>Through</Text>
                            <DateSelector
                                label="Competition start date through"
                                value={through}
                                minimumDate={from || undefined}
                                onChange={(value) => {setThrough(value); setError(null);}}
                            />
                            {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
                            <View style={styles.actions}>
                                <Pressable accessibilityRole="button" onPress={() => onApply({from: '', through: ''})} style={styles.reset}>
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
