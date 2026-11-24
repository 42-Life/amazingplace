// TOP SUBMISSIONS
// The 3 most-voted submissions in a row that scrolls sideways: 1st on the left,
// scroll right for 2nd and 3rd. Tapping one opens its submission page.
// Each card is narrower than the screen, so the next one peeks in from the right
// and it's clear there's more to scroll to.

import {Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {Image} from 'expo-image';
import {router} from 'expo-router';
import VideoTile from '@/components/capture/VideoTile';
import {theme} from '@/constants/theme';
import type {TopSubmission} from '@/lib/challenge-stats';

// Badge colors for 1st, 2nd and 3rd. Dark enough for white text on top.
const MEDAL_COLORS = ['#B8860B', '#6B7280', '#9A5B2E'];

const CARD_GAP = 12;

// The stats page's side padding. The row stretches past it to the screen edges, so cards
// scroll all the way off screen instead of being cut off 20 points in.
const PAGE_PADDING = 20;

export default function TopSubmissions({submissions}: {submissions: TopSubmission[]}) {
    const {width} = useWindowDimensions();
    // About 70% of the screen, capped for tablets
    const cardWidth = Math.min(width * 0.7, 320);

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            // Each swipe stops with a card lined up on the left edge
            snapToInterval={cardWidth + CARD_GAP}
            snapToAlignment="start"
            decelerationRate="fast"
            style={styles.scroller}
            contentContainerStyle={styles.row}
        >
            {submissions.map((submission, rank) => {
                const votes = `${submission.votes.toLocaleString()} ${submission.votes === 1 ? 'vote' : 'votes'}`;
                return (
                    <Pressable
                        key={submission.id}
                        onPress={() => router.push(`/submission/${submission.id}`)}
                        accessibilityRole="button"
                        accessibilityLabel={`Number ${rank + 1} of ${submissions.length}: ${submission.mediaType} by ${submission.username}, ${votes}`}
                        style={({pressed}) => [styles.card, {width: cardWidth}, pressed && styles.pressed]}
                    >
                        <View>
                            {submission.mediaType === 'video'
                                ? <VideoTile durationMs={submission.durationMs} style={styles.media} />
                                : <Image source={{uri: submission.imageUrl}} style={styles.media} contentFit="cover" transition={150} />}
                            <View style={[styles.medal, {backgroundColor: MEDAL_COLORS[rank]}]}>
                                <Text style={styles.medalText}>{rank + 1}</Text>
                            </View>
                        </View>
                        <Text style={styles.username} numberOfLines={1}>@{submission.username}</Text>
                        <Text style={styles.votes}>{votes}</Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroller: {marginHorizontal: -PAGE_PADDING},
    row: {paddingHorizontal: PAGE_PADDING, gap: CARD_GAP},
    card: {gap: 4},
    pressed: {opacity: 0.7},
    media: {width: '100%', aspectRatio: 4 / 5, borderRadius: 12, backgroundColor: theme.colors.surfaceMuted},
    medal: {position: 'absolute', top: 8, left: 8, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center'},
    medalText: {fontSize: 15, fontWeight: '700', color: '#FFFFFF'},
    username: {fontSize: 15, fontWeight: '700', color: theme.colors.text},
    votes: {fontSize: 13, color: theme.colors.inactive},
});
