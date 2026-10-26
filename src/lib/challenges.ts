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

    // STEP 4: Insert the challenge and ask the database to send the saved row back
    const {data, error} = await supabase
        .from('challenges')
        .insert({title, description, latitude, longitude})
        .select('id, title, description, latitude, longitude')
        .single();

    // STEP 5: Stop here if saving failed
    if (error) throw error;

    // STEP 6: Return the new challenge, so the app can show it right away
    return data as ChallengeLocation;
}
