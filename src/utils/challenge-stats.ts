// CHALLENGE STATS MATH
// Ranking submissions by votes, and counting submissions over time for the stats page's chart.
// No imports here, so the tests can load this file directly (see tests/challenge-stats.test.cjs).
// Dates use the phone's local time, matching getChallengeDate in challenge-dates.ts.


// RANK SUBMISSIONS
// The most-voted submissions, best first. A tie goes to whoever submitted first.
// Submissions with no votes are left out, so "top 3" never shows three entries nobody picked.
export function rankSubmissions<T extends {id: string; createdAt: string}>(
    rows: T[],
    voteCounts: Record<string, number>,
    limit = 3,
): (T & {votes: number})[] {
    return rows
        .map((row) => ({...row, votes: voteCounts[row.id] ?? 0}))
        .filter((row) => row.votes > 0)
        .sort((a, b) => b.votes - a.votes || a.createdAt.localeCompare(b.createdAt))
        .slice(0, limit);
}


// TIMELINE
// How long each bar on the chart covers
export type TimelineUnit = 'hour' | 'day' | 'week';

export type TimelineBucket = {
    start: string   // when this bar's period begins (ISO time)
    count: number   // submissions made in it
};

export type Timeline = {
    unit: TimelineUnit
    buckets: TimelineBucket[]   // empty if the challenge hasn't started yet
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Midnight at the start of a YYYY-MM-DD day, in local time
const startOfDay = (date: string) => new Date(`${date}T00:00:00`);

// One step forward. setHours/setDate rather than adding milliseconds, so a daylight
// saving change doesn't knock every later bar an hour off midnight.
function step(date: Date, unit: TimelineUnit): Date {
    const next = new Date(date);
    if (unit === 'hour') next.setHours(next.getHours() + 1);
    else next.setDate(next.getDate() + (unit === 'day' ? 1 : 7));
    return next;
}

// BUCKET BY TIME
// Counts submissions per hour, day or week, from the challenge's start until now
// (or its end, if it has ended). Empty periods are kept as 0, so quiet spells show on the chart.
//   The bar size follows the stretch being shown: hours for up to 2 days, days for up to
//   60 days, weeks beyond that. That keeps the chart to roughly 60 bars at most.
export function bucketByTime(timestamps: string[], startDate: string, endDate: string, now = new Date()): Timeline {
    const rangeStart = startOfDay(startDate);
    const dayAfterEnd = step(startOfDay(endDate), 'day');
    const rangeEnd = now < dayAfterEnd ? now : dayAfterEnd;

    const span = rangeEnd.getTime() - rangeStart.getTime();
    const unit: TimelineUnit = span <= 2 * DAY_MS ? 'hour' : span <= 60 * DAY_MS ? 'day' : 'week';
    if (span <= 0) return {unit, buckets: []};

    // STEP 1: Lay out the empty bars
    const starts: Date[] = [];
    for (let at = rangeStart; at < rangeEnd; at = step(at, unit)) starts.push(at);
    const counts = starts.map(() => 0);

    // STEP 2: Drop each submission into its bar.
    //   Anything outside the range goes in the first or last bar, so the bars always add up
    //   to the submission total shown above the chart.
    for (const timestamp of timestamps) {
        const time = new Date(timestamp).getTime();
        let index = 0;
        while (index < starts.length - 1 && starts[index + 1].getTime() <= time) index++;
        counts[index]++;
    }

    return {unit, buckets: starts.map((start, i) => ({start: start.toISOString(), count: counts[i]}))};
}
