// SUBMISSIONS TIMELINE
// A line graph of submissions per hour, day or week (see bucketByTime in utils/challenge-stats.ts).
// Drawn with react-native-svg: one point per period, joined by a line, with a light fill underneath.

import {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, Line, Path} from 'react-native-svg';
import {theme} from '@/constants/theme';
import type {Timeline, TimelineUnit} from '@/utils/challenge-stats';

const CHART_HEIGHT = 140;
// Room inside the drawing so the line and dots at the very top or bottom aren't cut in half
const INSET = 5;
// With more points than this, dots would crowd into a smear, so only the line is drawn
const MAX_DOTS = 31;

// How a period's start time is written under the chart
function formatStart(iso: string, unit: TimelineUnit): string {
    const date = new Date(iso);
    return unit === 'hour'
        ? date.toLocaleString(undefined, {month: 'short', day: 'numeric', hour: 'numeric'})
        : date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}

const plural = (count: number) => `${count.toLocaleString()} ${count === 1 ? 'submission' : 'submissions'}`;

export default function SubmissionsTimeline({timeline}: {timeline: Timeline}) {
    const {colors} = theme;
    const {unit, buckets} = timeline;
    // The drawing's width isn't known until it's laid out
    const [width, setWidth] = useState(0);

    const max = Math.max(...buckets.map((bucket) => bucket.count), 1);
    // The busiest period; the earliest one if there's a tie
    const busiestIndex = buckets.reduce((best, bucket, i) => bucket.count > buckets[best].count ? i : best, 0);
    const busiest = buckets[busiestIndex];

    // WHERE EACH POINT GOES
    //   x: spread evenly from left to right (a single point sits in the middle)
    //   y: 0 at the bottom, the highest count at the top
    const innerWidth = Math.max(width - INSET * 2, 0);
    const innerHeight = CHART_HEIGHT - INSET * 2;
    const points = buckets.map((bucket, i) => ({
        x: INSET + (buckets.length === 1 ? innerWidth / 2 : (i / (buckets.length - 1)) * innerWidth),
        y: INSET + innerHeight - (bucket.count / max) * innerHeight,
    }));
    const bottom = INSET + innerHeight;

    // The line, and the same line closed along the bottom for the fill
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const areaPath = points.length > 0
        ? `${linePath} L${points[points.length - 1].x},${bottom} L${points[0].x},${bottom} Z`
        : '';

    const first = formatStart(buckets[0].start, unit);
    const last = formatStart(buckets[buckets.length - 1].start, unit);
    const summary = `Submissions per ${unit}, from ${first} to ${last}. Busiest ${unit}: ${formatStart(busiest.start, unit)}, with ${plural(busiest.count)}.`;

    return (
        <View style={styles.container}>
            {/* 1. The graph. Screen readers get the summary instead of the drawing */}
            <View style={styles.chartRow} accessible accessibilityRole="image" accessibilityLabel={summary}>
                {/* Scale on the left: the highest count at the top, 0 at the bottom */}
                <View style={styles.axis}>
                    <Text style={styles.axisText}>{max.toLocaleString()}</Text>
                    <Text style={styles.axisText}>0</Text>
                </View>
                <View style={styles.plot} onLayout={({nativeEvent: {layout}}) => setWidth(layout.width)}>
                    {width > 0 && (
                        <Svg width={width} height={CHART_HEIGHT}>
                            {/* Guide lines at the top (the highest count) and the bottom (0) */}
                            <Line x1={0} x2={width} y1={INSET} y2={INSET} stroke={colors.tabBarBorder} strokeDasharray="4 4" />
                            <Line x1={0} x2={width} y1={bottom} y2={bottom} stroke={colors.tabBarBorder} />

                            <Path d={areaPath} fill={colors.active} fillOpacity={0.12} />
                            <Path d={linePath} stroke={colors.active} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" fill="none" />

                            {/* A dot per period when there's room, and always one on the busiest */}
                            {buckets.length <= MAX_DOTS && points.map((p, i) => (
                                <Circle key={buckets[i].start} cx={p.x} cy={p.y} r={3} fill={colors.background} stroke={colors.active} strokeWidth={2} />
                            ))}
                            <Circle cx={points[busiestIndex].x} cy={points[busiestIndex].y} r={5} fill={colors.active} />
                        </Svg>
                    )}
                </View>
            </View>

            {/* 2. First and last dates under the graph */}
            <View style={styles.labels}>
                <Text style={styles.axisText}>{first}</Text>
                {buckets.length > 1 && <Text style={styles.axisText}>{last}</Text>}
            </View>

            {/* 3. One line that says what the graph shows */}
            <Text style={styles.caption}>
                Busiest {unit}: {formatStart(busiest.start, unit)} ({plural(busiest.count)})
            </Text>
        </View>
    );
}

const AXIS_WIDTH = 28;

const styles = StyleSheet.create({
    container: {gap: 6},
    chartRow: {flexDirection: 'row', height: CHART_HEIGHT, gap: 6},
    // The scale's numbers line up with the guide lines, which sit INSET from the top and bottom
    axis: {width: AXIS_WIDTH, justifyContent: 'space-between', alignItems: 'flex-end', marginVertical: INSET - 7},
    plot: {flex: 1},
    labels: {flexDirection: 'row', justifyContent: 'space-between', marginLeft: AXIS_WIDTH + 6},
    axisText: {fontSize: 12, lineHeight: 14, color: theme.colors.inactive, fontVariant: ['tabular-nums']},
    caption: {fontSize: 14, color: theme.colors.text},
});
