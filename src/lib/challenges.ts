// CHALLENGE CREATION
// Everything the app needs to let a signed-in user create a new challenge.

// KEY IMPORTS
import type { ChallengeLocation } from '@/constants/types';
import { supabase } from '@/lib/supabase';
import { getChallengeDate, isValidChallengeDate } from '@/utils/challenge-dates';


// FETCH CHALLENGES
// Gets the list of challenges from the database (used when picking which challenge to enter)
export async function fetchChallenges(): Promise<ChallengeLocation[]> {
    // STEP 1: Get challenges that have not ended, sorted by title.
    const {data, error} = await supabase
        .from('challenges')
        .select('id, title, description, latitude, longitude, start_at, end_at, radius_m')
        .gte('end_at', getChallengeDate())
        .order('title');

    // STEP 2: Stop here if the request failed
    if (error) throw error;

    // STEP 3: Return the list (an empty list if there are none yet)
    //   flatMap, not map: a challenge with broken coordinates is skipped with a warning
    //   rather than thrown, so one bad row can't empty the whole map
    return (data ?? []).flatMap((challenge) => {
        // A missing coordinate has to be caught before Number(), because Number(null) is 0
        // and that would silently place the challenge off the coast of Africa
        if (challenge.latitude == null || challenge.longitude == null) {
            console.warn(`Skipping challenge with missing coordinates: ${challenge.id}`);
            return [];
        }

        const latitude = Number(challenge.latitude);
        const longitude = Number(challenge.longitude);

        if (
            !Number.isFinite(latitude) || !Number.isFinite(longitude)
            || latitude < -90 || latitude > 90
            || longitude < -180 || longitude > 180
        ) {
            console.warn(`Skipping challenge with invalid coordinates: ${challenge.id}`);
            return [];
        }

        return [{
            id: String(challenge.id),
            title: challenge.title,
            description: challenge.description,
            latitude, longitude,
            start_at: challenge.start_at,
            end_at: challenge.end_at,
            radius_m: Number(challenge.radius_m),
        }]
    })

}


// FETCH ONE CHALLENGE
// Gets a single challenge by its id (used by the individual challenge page).
// Returns null if no challenge has that id, e.g. it was deleted while the app was open.
export async function fetchChallengeById(id: string): Promise<ChallengeLocation | null> {
    // STEP 1: Ask the database for the one row with this id
    //   maybeSingle, not single: a missing row comes back as null instead of an error
    const {data, error} = await supabase
        .from('challenges')
        .select('id, title, description, latitude, longitude, start_at, end_at, radius_m')
        .eq('id', id)
        .gte('end_at', getChallengeDate())
        .maybeSingle();

    // STEP 2: Stop here if the request failed
    if (error) throw error;

    // STEP 3: Return the challenge, or null if there is no such id
    return data as ChallengeLocation | null;
}


// NEW CHALLENGE TYPE
// What the user fills in when creating a challenge (the app picks the id).
// Everything here is required, matching the columns the database won't allow to be null.
export type NewChallenge = Omit<ChallengeLocation, 'id'>;


// GENERATE CHALLENGE ID
// Turns a title into a readable id (e.g. "BU CAS Photo Challenge" becomes "bu-cas-photo-challenge").
// If another challenge already has that id, adds -2, -3, and so on until it's unique.
async function generateChallengeId(title: string): Promise<string> {
    // STEP 1: Make the title URL-friendly: lowercase letters, numbers and dashes only
    //   Falls back to "challenge" if the title had no letters or numbers
    const base = title
        .toLowerCase()
        .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')   // drops accents (é becomes e)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
        .replace(/-+$/, '') || 'challenge';

    // STEP 2: Include ended challenges here: their IDs are still taken.
    const {data, error} = await supabase
        .from('challenges')
        .select('id')
        .like('id', `${base}%`);
    if (error) throw error;
    const taken = new Set((data ?? []).map((row) => row.id as string));

    // STEP 3: Use the plain id if it's free, otherwise count up until one is
    if (!taken.has(base)) return base;
    let suffix = 2;
    while (taken.has(`${base}-${suffix}`)) suffix++;
    return `${base}-${suffix}`;
}


// CREATE CHALLENGE
// Checks the details, saves a new challenge to the database, and returns it (with its new id).
export async function createChallenge(challenge: NewChallenge): Promise<ChallengeLocation> {
    // STEP 1: Clean up the text and make sure nothing important is missing
    const title = challenge.title.trim();
    const description = challenge.description.trim();
    if (!title) throw new Error('A challenge needs a title.');
    if (!description) throw new Error('A challenge needs a description.');

    // STEP 2a: Make sure latitude runs from -90 to 90, longitude from -180 to 180
    const {latitude, longitude} = challenge;
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error('Latitude must be between -90 and 90.');
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('Longitude must be between -180 and 180.');

    // STEP 2b: Photos must be taken within this many meters of the pin (database: not null, > 0)
    const {radius_m} = challenge;
    if (radius_m == null || !Number.isFinite(radius_m) || radius_m <= 0) throw new Error('Radius must be more than 0 meters.');

    // STEP 2c: Both dates are required (database: not null), must be real dates, not in the past,
    //   and the end can't come before the start.
    //   isValidChallengeDate also rejects a missing or empty date.
    //   YYYY-MM-DD strings sort like dates, so plain < comparisons work
    const {start_at, end_at} = challenge;
    const today = getChallengeDate();
    if (!start_at || !isValidChallengeDate(start_at)) throw new Error('Pick a valid start date.');
    if (!end_at || !isValidChallengeDate(end_at)) throw new Error('Pick a valid end date.');
    if (start_at < today) throw new Error('The start date can\'t be in the past.');
    if (end_at < start_at) throw new Error('The end date can\'t be before the start date.');

    // STEP 3: Make sure the user is signed in
    const {data: {session}} = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Please sign in first.');

    // STEP 4: Make an id that no other challenge is using
    const id = await generateChallengeId(title);

    // STEP 5: Insert the challenge and ask the database to send the saved row back
    const {data, error} = await supabase
        .from('challenges')
        .insert({id, title, description, latitude, longitude, radius_m, start_at, end_at})
        .select('id, title, description, latitude, longitude, start_at, end_at, radius_m')
        .single();

    // STEP 6: Stop here if saving failed
    //   Code 23505 means the id was taken after our check (someone else created a challenge at the same moment)
    if (error?.code === '23505') throw new Error('Another challenge was just created with a similar name. Please try again.');
    if (error) throw error;

    // STEP 7: Return the new challenge, so the app can show it right away
    return data as ChallengeLocation;
}
