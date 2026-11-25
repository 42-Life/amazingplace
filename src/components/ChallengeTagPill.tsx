
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';

import type { ChallengeTagProps } from '@/constants/types';
import { getChallengeTag } from '@/utils/challenge-tags';

type Props = ChallengeTagProps & {
    compact?: boolean;
};

export default function ChallengeTagPills({tags, compact = false,}: Props) {
    if (!tags?.length) return null;

    return (
        <View style={styles.container}>
            {tags.map((id) => {
                const tag = getChallengeTag(id);
                if (!tag) return null;

                return (
                    <View
                        key={id}
                        style={[
                            styles.pill,
                            {
                                backgroundColor: tag.backgroundColor,
                                borderColor: tag.color,
                            },
                            compact && styles.compactPill,
                        ]}
                    >
                        <Ionicons
                            name={tag.icon}
                            size={compact ? 12 : 14}
                            color={tag.color}
                        />
                        <Text
                            style={[
                                styles.label,
                                { color: tag.color },
                                compact && styles.compactLabel,
                            ]}
                        >
                            {tag.label}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    compactPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
    },
    compactLabel: {
        fontSize: 10,
    },
});
