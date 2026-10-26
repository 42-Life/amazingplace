// CHALLENGE CREATION
// Everything the app needs to let a signed-in user create a new challenge.

// KEY IMPORTS
import {supabase} from '@/lib/supabase';
import type {ChallengeLocation} from '@/constants/types';


// FETCH CHALLENGES
// Gets the list of challenges from the database (used when picking which challenge to enter)
export async function fetchChallenges(): Promise<ChallengeLocation[]> {
    // STEP 1: Ask the database for every challenge, sorted by title
    const {data, error} = await supabase
        .from('challenges')
        .select('id, title, description, latitude, longitude')
        .order('title');

    // STEP 2: Stop here if the request failed
    if (error) throw error;

    // STEP 3: Return the list (an empty list if there are none yet)
    return (data ?? []) as ChallengeLocation[];
}


// NEW CHALLENGE TYPE
// What the user fills in when creating a challenge (the database picks the id)
export type NewChallenge = Omit<ChallengeLocation, 'id'>;


// GENERATE CHALLENGE ID
// Turns a title into a readable id (e.g. "BU CAS Photo Challenge" becomes "bu-cas-photo-challenge").
// If another challenge already has that id, adds -2, -3, and so on until it's unique.
async function generateChallengeId(title: string): Promise<string> {
    // STEP 1: Make the title URL-friendly: lowercase letters, numbers and dashes only
    //   Falls back to "challenge" if the title had no letters or numbers
    const base = title
        .toLowerCase()
        .normalize('NFKD').replace(/[̀-ͯ]/g, '')   // drops accents (é becomes e)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
        .replace(/-+$/, '') || 'challenge';

    // STEP 2: Fetch every existing id that starts with this one
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

    // STEP 2: Make sure the location is a real spot on the map
    //   Latitude runs from -90 to 90, longitude from -180 to 180
    const {latitude, longitude} = challenge;
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error('Latitude must be between -90 and 90.');
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('Longitude must be between -180 and 180.');

    // STEP 3: Make sure the user is signed in (every phone is signed in anonymously on launch)
    const {data: {session}} = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not signed in yet. Try closing and reopening the app.');

    // STEP 4: Make an id that no other challenge is using
    const id = await generateChallengeId(title);

    // STEP 5: Insert the challenge and ask the database to send the saved row back
    const {data, error} = await supabase
        .from('challenges')
        .insert({id, title, description, latitude, longitude})
        .select('id, title, description, latitude, longitude')
        .single();

    // STEP 6: Stop here if saving failed
    //   Code 23505 means the id was taken after our check (someone else created a challenge at the same moment)
    if (error?.code === '23505') throw new Error('Another challenge was just created with a similar name. Please try again.');
    if (error) throw error;

    // STEP 7: Return the new challenge, so the app can show it right away
    return data as ChallengeLocation;
}
