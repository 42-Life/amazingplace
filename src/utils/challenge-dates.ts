// CHALLENGE DATES
// Challenge dates are calendar days (YYYY-MM-DD), so a challenge stays open through that entire local day.
// No imports, so the tests can load this file directly.

import { theme } from "@/constants/theme";

// end_at is a date, so challenges remain active through that entire local day.
export function getChallengeDate(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function isValidChallengeDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00`);
    return !Number.isNaN(date.getTime()) && getChallengeDate(date) === value;
}

// The day `days` after (or before, if negative) a YYYY-MM-DD date.
// Read at midday so daylight saving changes can't skip or repeat a day.
export function addDays(value: string, days: number): string {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + days);
    return getChallengeDate(date);
}

// Shown as "Nov 20, 2026" (read at midday so time zones can't shift it a day)
export function formatChallengeDate(value: string): string {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});
}


// CHALLENGE PHASES
// Every challenge runs in four phases:
//   upcoming  before start_at                               nothing to do yet
//   entry     start_at through end_at                       submit photos/videos
//   voting    the day after end_at through voting_end_at    vote for a submission
//   closed    after voting_end_at                           results are final
// The database works this out the same way (challenge_phase in supabase/schema/functions.sql)
// and refuses submissions outside entry and votes outside voting.
export type ChallengePhase = 'upcoming' | 'entry' | 'voting' | 'closed';

// How long voting lasts unless the creator picks otherwise (the database uses the same default)
export const DEFAULT_VOTING_DAYS = 3;

type ChallengeSchedule = {start_at: string; end_at: string; voting_end_at: string};

export function getChallengePhase({start_at, end_at, voting_end_at}: ChallengeSchedule, today = getChallengeDate()): ChallengePhase {
    // YYYY-MM-DD strings sort like dates, so plain comparisons work
    if (today < start_at) return 'upcoming';
    if (today <= end_at) return 'entry';
    if (today <= voting_end_at) return 'voting';
    return 'closed';
}

// The first day of voting: the day after entries close
export const getVotingStartDate = (challenge: Pick<ChallengeSchedule, 'end_at'>) => addDays(challenge.end_at, 1);

// Why the user can't vote right now, written for an alert. null while voting is open.
export function getVotingClosedMessage(challenge: ChallengeSchedule, today = getChallengeDate()): string | null {
    switch (getChallengePhase(challenge, today)) {
        case 'voting': return null;
        case 'closed': return `Voting ended on ${formatChallengeDate(challenge.voting_end_at)}.`;
        default: return `Voting opens on ${formatChallengeDate(getVotingStartDate(challenge))}, after entries close.`;
    }
}

// One line saying where the challenge stands, e.g. "Entries close Dec 7, 2026"
export function describeChallengePhase(challenge: ChallengeSchedule, today = getChallengeDate()): string {
    switch (getChallengePhase(challenge, today)) {
        case 'upcoming': return `Entries open ${formatChallengeDate(challenge.start_at)}`;
        case 'entry': return `Entries close ${formatChallengeDate(challenge.end_at)}`;
        case 'voting': return `Voting ends ${formatChallengeDate(challenge.voting_end_at)}`;
        case 'closed': return `Voting ended ${formatChallengeDate(challenge.voting_end_at)}`;
    }
}

// Short label for lists, e.g. on the challenge dashboard
export const CHALLENGE_PHASE_LABELS: Record<ChallengePhase, string> = {
    upcoming: 'Upcoming',
    entry: 'Open for entries',
    voting: 'Voting',
    closed: 'Closed',
};

export const CHALLENGE_PHASE_STYLES: Record<ChallengePhase, string> = {
    upcoming: theme.challengePhases.upcoming,
    entry: theme.challengePhases.entry,
    voting: theme.challengePhases.voting,
    closed: theme.challengePhases.closed,
}

export function getChallengePhaseDisplay(challenge: ChallengeSchedule, today = getChallengeDate()) {
    const phase = getChallengePhase(challenge, today);
    return {
        phase,
        label: CHALLENGE_PHASE_LABELS[phase],
        color: CHALLENGE_PHASE_STYLES[phase],
    };
}