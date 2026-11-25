// CHALLENGE SORTING
// The choices in the list view's "Sort By..." dropdown, and the function that puts challenges in that order.

// KEY IMPORTS
import type { ChallengeLocation, ChallengeSort, ChallengeSortField, ChallengeSortOption } from '@/constants/types';
import { getChallengeDate } from '@/utils/challenge-dates';

// SORT OPTIONS
export const CHALLENGE_SORT_OPTIONS: ChallengeSortOption[] = [
    // TODO: Bring back the added sorts. See types.ts also
    // {field: 'added',    direction: 'desc', fieldLabel: 'Date Added', directionLabel: 'Newest First'},
    // {field: 'added',    direction: 'asc',  fieldLabel: 'Date Added', directionLabel: 'Oldest First'},
    {field: 'ending',   direction: 'asc',  fieldLabel: 'End Date',   directionLabel: 'Soonest First'},
    {field: 'ending',   direction: 'desc', fieldLabel: 'End Date',   directionLabel: 'Latest First'},
    {field: 'duration', direction: 'asc',  fieldLabel: 'Duration',   directionLabel: 'Shortest First'},
    {field: 'duration', direction: 'desc', fieldLabel: 'Duration',   directionLabel: 'Longest First'},
    {field: 'price',    direction: 'asc',  fieldLabel: 'Price',      directionLabel: 'Low to High'},
    {field: 'price',    direction: 'desc', fieldLabel: 'Price',      directionLabel: 'High to Low'},
];

// TITLE TEXT
export function sortTitle(sort: ChallengeSort): string {
    const option = CHALLENGE_SORT_OPTIONS.find(
        option => option.field === sort.field &&  option.direction === sort.direction);
    return option
        ? `Sort: ${option.fieldLabel} (${option.directionLabel})`
        : '';
}

// DATE HELPERS
// STEP 1: turn a date (or full timestamp) into a plain YYYY-MM-DD day, the same way filter.ts does. Timestamp then can't slip to wrong day for timeszones west of UTC
function toChallengeDay(value?: string | null): string | null {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : getChallengeDate(date);
}

// STEP 2: turn a YYYY-MM-DD day into a day count, so two days can be subtracted
function dayNumber(day: string | null): number | null {
    if (!day) return null;
    const [year, month, date] = day.split('-').map(Number);
    const count = Date.UTC(year, month - 1, date) / 86400000;
    return Number.isFinite(count) ? count : null;
}

// SORT KEYS: each sort turns a challenge into one number. null means "unknown" and always sorts last.
const SORT_KEYS: Record<ChallengeSortField, (challenge: ChallengeLocation) => number | null> = {
    // When it was added (needs created_at)
    // TODO: Implement created_at in ChallengeLocation type, so newest/oldest sort can be implemented
    // added: (c) => {
    //     const time = Date.parse(c.created_at ?? '');
    //     return Number.isNaN(time) ? null : time;
    // },
    // Last day of the challenge
    ending: (c) => dayNumber(toChallengeDay(c.end_at)),
    // How many days it runs, counting the first and last day
    duration: (c) => {
        const start = dayNumber(toChallengeDay(c.start_at));
        const end = dayNumber(toChallengeDay(c.end_at));
        return start === null || end === null ? null : end - start + 1;
    },
    // Entry fee in cents (free = 0)
    price: (c) => {
        const cents = Number(c.price_cents ?? 0);
        return Number.isNaN(cents) ? null : cents;
    },
};

// MAIN FUNCTION: returns the challenges in the chosen order (or untouched if no sort is chosen)
export function sortChallenges(challenges: ChallengeLocation[], sort: ChallengeSort | null): ChallengeLocation[] {
    // STEP 1: no sort chosen, so keep the order as it is
    if (!sort) return challenges;

    // STEP 2: work out each challenge's number once, and which way round to put them
    const keyOf = SORT_KEYS[sort.field];
    const direction = sort.direction === 'asc' ? 1 : -1;

    return challenges
        .map((challenge) => ({challenge, key: keyOf(challenge)}))
        .sort((a, b) => {
            // STEP 3: challenges with an unknown value always go last, whichever way the sort runs
            if (a.key === null && b.key === null) return a.challenge.title.localeCompare(b.challenge.title);
            if (a.key === null) return 1;
            if (b.key === null) return -1;
            // STEP 4: compare the numbers; ties are broken by title so the order never jumps around
            return (a.key - b.key) * direction || a.challenge.title.localeCompare(b.challenge.title);
        })
        // STEP 5: drop the numbers, keep just the challenges
        .map(({challenge}) => challenge);
}

