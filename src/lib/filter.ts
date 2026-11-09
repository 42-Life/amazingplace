import type {ChallengeLocation} from '@/constants/types';
import {supabase} from '@/lib/supabase';
import {getChallengeDate, isValidChallengeDate} from '@/utils/challenge-dates';

export type ChallengeStartDateFilter = {from: string; through: string};

// Filter start_at by calendar date, including both ends of the range.
export function filterChallengesByStartDate(
    challenges: ChallengeLocation[],
    {from, through}: ChallengeStartDateFilter,
): ChallengeLocation[] {
    if (!from && !through) return challenges;
    return challenges.filter((challenge) => {
        if (!challenge.start_at) return false;
        let date = challenge.start_at;
        // Date-only values must not shift to the previous day in time zones west of UTC.
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            const startedAt = new Date(date);
            if (Number.isNaN(startedAt.getTime())) return false;
            date = getChallengeDate(startedAt);
        }
        if (!isValidChallengeDate(date)) return false;
        return (!from || date >= from) && (!through || date <= through);
    });
}

// Only challenges whose end date has not passed are included.
// Matches part of a title or all stemmed search words in a description, ignoring case.
// Description words may appear in any order. Blank searches return no results.
export async function searchChallengesByName(name: string): Promise<ChallengeLocation[]> {
    const query = name.trim();
    if (!query) return [];

    // Treat SQL pattern characters in the search text as literal characters.
    const escapedQuery = query.replace(/[\\%_]/g, '\\$&');
    // Quote values so punctuation cannot change the PostgREST filter structure.
    // English text search stems words and ignores common words such as "the".
    const filters = [
        `title.ilike.${JSON.stringify(`%${escapedQuery}%`)}`,
        `description.plfts(english).${JSON.stringify(query)}`,
    ].join(',');
    const {data, error} = await supabase
        .from('challenges')
        .select('id, title, description, latitude, longitude, start_at')
        .gte('end_at', getChallengeDate())
        .or(filters)
        .order('title');

    if (error) throw error;
    return (data ?? []) as ChallengeLocation[];
}
