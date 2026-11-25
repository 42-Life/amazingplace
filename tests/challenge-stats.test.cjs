// Tests for src/utils/challenge-stats.ts (top submissions and the submissions-over-time chart).
// Node loads the TypeScript file directly, since it has no imports (needs Node 22.18 or newer).
// Times are built with new Date(y, m, d, h) so the tests pass in any time zone.
const test = require('node:test');
const assert = require('node:assert/strict');
const {rankSubmissions, bucketByTime} = require('../src/utils/challenge-stats.ts');

const at = (day, hour = 12) => new Date(2026, 10, day, hour).toISOString();   // November 2026, local time

test('most votes first, and only submissions that have votes', () => {
    const rows = [
        {id: 'a', createdAt: at(1)},
        {id: 'b', createdAt: at(2)},
        {id: 'c', createdAt: at(3)},
        {id: 'd', createdAt: at(4)},
    ];
    const top = rankSubmissions(rows, {a: 1, b: 5, c: 3});
    assert.deepEqual(top.map((row) => [row.id, row.votes]), [['b', 5], ['c', 3], ['a', 1]]);
});

test('a tie goes to the earlier submission', () => {
    const rows = [{id: 'late', createdAt: at(5)}, {id: 'early', createdAt: at(1)}];
    assert.deepEqual(rankSubmissions(rows, {late: 2, early: 2}).map((row) => row.id), ['early', 'late']);
});

test('no more than the limit, and nothing when nobody has voted', () => {
    const rows = ['a', 'b', 'c', 'd', 'e'].map((id, i) => ({id, createdAt: at(i + 1)}));
    assert.equal(rankSubmissions(rows, {a: 1, b: 1, c: 1, d: 1, e: 1}).length, 3);
    assert.equal(rankSubmissions(rows, {a: 1, b: 1}, 1).length, 1);
    assert.deepEqual(rankSubmissions(rows, {}), []);
});

test('a week-long challenge that has ended gets one bar per day', () => {
    const timeline = bucketByTime([at(1), at(1, 20), at(3), at(7, 23)], '2026-11-01', '2026-11-07', new Date(2026, 11, 1));
    assert.equal(timeline.unit, 'day');
    assert.deepEqual(timeline.buckets.map((bucket) => bucket.count), [2, 0, 1, 0, 0, 0, 1]);
    assert.equal(timeline.buckets[0].start, new Date(2026, 10, 1).toISOString());
});

test('a running challenge stops at now', () => {
    const timeline = bucketByTime([at(1)], '2026-11-01', '2026-11-30', new Date(2026, 10, 4, 9));
    assert.equal(timeline.unit, 'day');
    assert.equal(timeline.buckets.length, 4);
});

test('a one-day challenge gets one bar per hour', () => {
    const timeline = bucketByTime([at(1, 9), at(1, 9), at(1, 15)], '2026-11-01', '2026-11-01', new Date(2026, 11, 1));
    assert.equal(timeline.unit, 'hour');
    assert.equal(timeline.buckets.length, 24);
    assert.equal(timeline.buckets[9].count, 2);
    assert.equal(timeline.buckets[15].count, 1);
});

test('a long challenge gets one bar per week', () => {
    const timeline = bucketByTime([at(1)], '2026-01-01', '2026-06-30', new Date(2026, 11, 1));
    assert.equal(timeline.unit, 'week');
    assert.ok(timeline.buckets.length >= 25 && timeline.buckets.length <= 27);
});

test('a challenge that has not started has no bars', () => {
    assert.deepEqual(bucketByTime([], '2026-12-01', '2026-12-07', new Date(2026, 10, 1)).buckets, []);
});

test('the bars always add up to the number of submissions', () => {
    // One submission before the start date and one after the end date still count
    const timestamps = [at(1), at(2), new Date(2026, 9, 30).toISOString(), new Date(2026, 11, 5).toISOString()];
    const timeline = bucketByTime(timestamps, '2026-11-01', '2026-11-03', new Date(2026, 11, 10));
    assert.equal(timeline.buckets.reduce((sum, bucket) => sum + bucket.count, 0), timestamps.length);
});
