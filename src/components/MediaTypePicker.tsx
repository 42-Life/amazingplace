// MEDIA TYPE PICKER
// Two side-by-side options for whether a challenge's entries are photos or videos.
// Used by the create-challenge form. The choice can't be changed once the challenge exists.

import {Ionicons} from '@expo/vector-icons';
import {Pressable, Text, View} from 'react-native';
import {createChallengeStyles as styles} from '@/constants/styles';
import {theme} from '@/constants/theme';
import type {MediaType} from '@/constants/types';

const OPTIONS: {value: MediaType; label: string; icon: keyof typeof Ionicons.glyphMap}[] = [
    {value: 'photo', label: 'Photos', icon: 'camera-outline'},
    {value: 'video', label: 'Videos', icon: 'videocam-outline'},
];

type MediaTypePickerProps = {
    value: MediaType,
    onChange: (value: MediaType) => void,
}

export default function MediaTypePicker({value, onChange}: MediaTypePickerProps) {
    return (
        <View style={styles.mediaTypeRow} accessibilityRole="radiogroup" accessibilityLabel="Entry type">
            {OPTIONS.map((option) => {
                const selected = option.value === value;
                return (
                    <Pressable
                        key={option.value}
                        onPress={() => onChange(option.value)}
                        accessibilityRole="radio"
                        accessibilityState={{checked: selected}}
                        style={[styles.mediaTypeOption, selected && styles.mediaTypeOptionSelected]}
                    >
                        <Ionicons name={option.icon} size={20} color={selected ? theme.colors.active : theme.colors.text} />
                        <Text style={[styles.mediaTypeText, selected && styles.mediaTypeTextSelected]}>{option.label}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
