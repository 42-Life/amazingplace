// Tests for the entry and voting periods in src/utils/challenge-dates.ts.
// Node loads the TypeScript file directly, since it has no imports (needs Node 22.18 or newer).
const test = require('node:test');
const assert = require('node:assert/strict');
const {addDays, getChallengePhase, getVotingClosedMessage, getVotingStartDate} = require('../src/utils/challenge-dates.ts');

// Entries Dec 1–7, voting Dec 8–10
const challenge = {start_at: '2026-12-01', end_at: '2026-12-07', voting_end_at: '2026-12-10'};

test('each phase covers whole days, including both ends', () => {
    assert.equal(getChallengePhase(challenge, '2026-11-30'), 'upcoming');
    assert.equal(getChallengePhase(challenge, '2026-12-01'), 'entry');
    assert.equal(getChallengePhase(challenge, '2026-12-07'), 'entry');
    assert.equal(getChallengePhase(challenge, '2026-12-08'), 'voting');
    assert.equal(getChallengePhase(challenge, '2026-12-10'), 'voting');
    assert.equal(getChallengePhase(challenge, '2026-12-11'), 'closed');
});

test('a one-day challenge goes straight from entry to voting', () => {
    const oneDay = {start_at: '2026-12-01', end_at: '2026-12-01', voting_end_at: '2026-12-02'};
    assert.equal(getChallengePhase(oneDay, '2026-12-01'), 'entry');
    assert.equal(getChallengePhase(oneDay, '2026-12-02'), 'voting');
    assert.equal(getChallengePhase(oneDay, '2026-12-03'), 'closed');
});

test('voting starts the day after entries close', () => {
    assert.equal(getVotingStartDate(challenge), '2026-12-08');
});

test('a voting message only when voting is not open', () => {
    assert.equal(getVotingClosedMessage(challenge, '2026-12-09'), null);
    assert.match(getVotingClosedMessage(challenge, '2026-12-03'), /^Voting opens on /);
    assert.match(getVotingClosedMessage(challenge, '2026-11-20'), /^Voting opens on /);
    assert.match(getVotingClosedMessage(challenge, '2026-12-11'), /^Voting ended on /);
});

test('adding days crosses months, years and daylight saving changes', () => {
    assert.equal(addDays('2026-11-30', 1), '2026-12-01');
    assert.equal(addDays('2026-12-30', 3), '2027-01-02');
    assert.equal(addDays('2026-11-01', 1), '2026-11-02');   // US clocks go back on Nov 1, 2026
    assert.equal(addDays('2026-03-08', 1), '2026-03-09');   // and forward on Mar 8, 2026
    assert.equal(addDays('2026-12-08', -1), '2026-12-07');
});
