import type {ChallengeLocation} from '@/constants/types';
import {supabase} from '@/lib/supabase';
import {getChallengeDate} from '@/utils/challenge-dates';

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
        .select('id, title, description, latitude, longitude')
        .gte('end_at', getChallengeDate())
        .or(filters)
        .order('title');

    if (error) throw error;
    return (data ?? []) as ChallengeLocation[];
}
