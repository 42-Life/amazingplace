import {Ionicons} from '@expo/vector-icons';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {CHALLENGE_TAGS, getChallengeTag,} from '@/utils/challenge-tags';
import {type ChallengeTagId} from "@/constants/types";

type ChallengeTagsProps = {
    tags: readonly string[] | null | undefined;
    /** Use optionA=true to switch to the stronger Option A colour treatment. */
    optionA?: boolean;
    compact?: boolean;
};

export function ChallengeTags({tags, optionA = false, compact = false}: ChallengeTagsProps) {
    const validTags = (tags ?? []).map(getChallengeTag).filter((tag): tag is NonNullable<typeof tag> => Boolean(tag));
    if (!validTags.length) return null;

    return (
        <View style={styles.row}>
            {validTags.map((tag) => (
                <View
                    key={tag.id}
                    accessibilityLabel={tag.label}
                    style={[
                        styles.pill,
                        {backgroundColor: optionA ? tag.optionABackgroundColor : tag.backgroundColor},
                        compact && styles.compactPill,
                    ]}
                >
                    <Ionicons name={tag.icon} size={compact ? 13 : 15} color={tag.color} />
                    <Text style={[styles.label, {color: '#172033'}, compact && styles.compactLabel]}>
                        {tag.label}
                    </Text>
                </View>
            ))}
        </View>
    );
}

type ChallengeTagPickerProps = {
    value: ChallengeTagId[];
    onChange: (next: ChallengeTagId[]) => void;
    disabled?: boolean;
};

export function ChallengeTagPicker({value, onChange, disabled = false}: ChallengeTagPickerProps) {
    const toggle = (id: ChallengeTagId) => {
        if (value.includes(id)) {
            onChange(value.filter((item) => item !== id));
        } else if (value.length < 3) {
            onChange([...value, id]);
        }
    };

    return (
        <View style={styles.pickerWrap}>
            <Text style={styles.helper}>{value.length}/3 selected. Choose at least one category.</Text>
            <View style={styles.row}>
                {CHALLENGE_TAGS.map((tag) => {
                    const selected = value.includes(tag.id);
                    const unavailable = !selected && value.length >= 3;
                    return (
                        <Pressable
                            key={tag.id}
                            accessibilityRole="checkbox"
                            accessibilityState={{checked: selected, disabled: disabled || unavailable}}
                            disabled={disabled || unavailable}
                            onPress={() => toggle(tag.id)}
                            style={[
                                styles.pill,
                                {backgroundColor: selected ? tag.backgroundColor : '#F4F5F6'},
                                selected && {borderColor: tag.color},
                                !selected && styles.unselected,
                                unavailable && styles.disabled,
                            ]}
                        >
                            <Ionicons name={tag.icon} size={15} color={selected ? tag.color : '#64748B'} />
                            <Text style={[styles.label, {color: '#172033'}]}>{tag.label}</Text>
                            {selected && <Ionicons name="checkmark-circle" size={14} color={tag.color} />}
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
    pill: {flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1, borderColor: 'transparent'},
    label: {fontSize: 13, fontWeight: '600'},
    compactPill: {paddingHorizontal: 8, paddingVertical: 5, gap: 4},
    compactLabel: {fontSize: 11},
    pickerWrap: {gap: 8},
    helper: {fontSize: 13, color: '#64748B'},
    unselected: {borderColor: '#E5E7EB'},
    disabled: {opacity: 0.45},
});
