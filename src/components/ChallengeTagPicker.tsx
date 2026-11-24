
import { Ionicons } from '@expo/vector-icons';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import type { ChallengeTagId } from '@/constants/types';
import { CHALLENGE_TAGS } from '@/utils/challenge-tags';
import { theme } from '@/constants/theme';

type Props = {
    value: ChallengeTagId[];
    onChange: (next: ChallengeTagId[]) => void;
    disabled?: boolean;
    maxSelections?: number;
};

export default function ChallengeTagPicker({ value, onChange, disabled = false, maxSelections = 3,}: Props) {
    const { colors } = theme;

    function toggleTag(id: ChallengeTagId) {
        if (disabled) return;

        if (value.includes(id)) {
            onChange(value.filter((tag) => tag !== id));
        } else if (value.length < maxSelections) {
            onChange([...value, id]);
        }
    }

    return (
        <View>
            <Text style={[styles.helper, { color: colors.inactive }]}>
                Select up to {maxSelections} categories
                ({value.length}/{maxSelections} selected)
            </Text>

            <View style={styles.container}>
                {CHALLENGE_TAGS.map((tag) => {
                    const selected = value.includes(tag.id);
                    const unavailable =
                        !selected && value.length >= maxSelections;

                    return (
                        <Pressable
                            key={tag.id}
                            disabled={disabled || unavailable}
                            onPress={() => toggleTag(tag.id)}
                            accessibilityRole="checkbox"
                            accessibilityState={{
                                checked: selected,
                                disabled: disabled || unavailable,
                            }}
                            style={[
                                styles.option,
                                {
                                    backgroundColor: selected
                                        ? tag.optionABackgroundColor
                                        : colors.background,
                                    borderColor: selected
                                        ? tag.color
                                        : colors.tabBarBorder,
                                },
                                (disabled || unavailable) && styles.disabled,
                            ]}
                        >
                            <Ionicons
                                name={tag.icon}
                                size={16}
                                color={tag.color}
                            />
                            <Text
                                style={[
                                    styles.label,
                                    { color: selected ? tag.color : colors.text },
                                ]}
                            >
                                {tag.label}
                            </Text>
                            {selected && (
                                <Ionicons
                                    name="checkmark-circle"
                                    size={16}
                                    color={tag.color}
                                />
                            )}
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    helper: {
        fontSize: 12,
        marginBottom: 10,
    },
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 9,
        borderRadius: 18,
        borderWidth: 1,
    },
    label: {
        fontSize: 12,
        fontWeight: '500',
    },
    disabled: {
        opacity: 0.4,
    },
});
