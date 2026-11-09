import {useState} from 'react';
import {Platform, Pressable, Text, View} from 'react-native';
import {DateTimePicker} from '@expo/ui/community/datetime-picker';
import {Ionicons} from '@expo/vector-icons';
import {getChallengeDate} from '@/utils/challenge-dates';
import {challengeFilterStyles as styles} from '@/constants/styles';
import {theme} from '@/constants/theme';

export type DateSelectorProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    minimumDate?: string;
    maximumDate?: string;
};

const toLocalDate = (value: string) => new Date(`${value}T12:00:00`);

export default function DateSelector({label, value, onChange, minimumDate, maximumDate}: DateSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [pickerDate, setPickerDate] = useState(new Date());

    const open = () => {
        let initial = value || getChallengeDate();
        if (minimumDate && initial < minimumDate) initial = minimumDate;
        if (maximumDate && initial > maximumDate) initial = maximumDate;
        setPickerDate(toLocalDate(initial));
        setIsOpen(true);
    };

    return (
        <View style={styles.dateField}>
            <View style={styles.dateRow}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${label}: ${value || 'No limit'}. Select date`}
                    accessibilityState={{expanded: isOpen}}
                    onPress={open}
                    style={[styles.input, styles.dateButton]}
                >
                    <Ionicons name="calendar-outline" size={20} color={theme.colors.inactive} />
                    <Text style={styles.dateText}>
                        {value ? toLocalDate(value).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'}) : 'Select date'}
                    </Text>
                </Pressable>
                {value && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Clear ${label.toLowerCase()}`}
                        onPress={() => {onChange(''); setIsOpen(false);}}
                        style={styles.close}
                    >
                        <Ionicons name="close-circle-outline" size={22} color={theme.colors.inactive} />
                    </Pressable>
                )}
            </View>
            {isOpen && (
                <View>
                    <DateTimePicker
                        value={pickerDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                        presentation="dialog"
                        themeVariant="light"
                        accentColor={theme.colors.active}
                        minimumDate={minimumDate ? toLocalDate(minimumDate) : undefined}
                        maximumDate={maximumDate ? toLocalDate(maximumDate) : undefined}
                        onValueChange={(_event, date) => {
                            setPickerDate(date);
                            onChange(getChallengeDate(date));
                            if (Platform.OS === 'android') setIsOpen(false);
                        }}
                        onDismiss={() => setIsOpen(false)}
                    />
                    {Platform.OS === 'ios' && (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Done selecting ${label.toLowerCase()}`}
                            style={styles.dateDone}
                            onPress={() => {onChange(getChallengeDate(pickerDate)); setIsOpen(false);}}
                        >
                            <Text style={styles.resetText}>Done</Text>
                        </Pressable>
                    )}
                </View>
            )}
        </View>
    );
}
