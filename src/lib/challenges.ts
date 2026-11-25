// CHALLENGE CREATION
// Everything the app needs to let a signed-in user create a new challenge.

// KEY IMPORTS
import type { ChallengeLocation } from '@/constants/types';
import { supabase } from '@/lib/supabase';
import { fetchMyAccount } from '@/lib/accounts';
import { deleteChallengePreview, uploadChallengePreview } from '@/lib/challenge-previews';
import { getChallengeDate, isValidChallengeDate } from '@/utils/challenge-dates';
import { normalizeChallengeTags } from '@/utils/challenge-tags';
import {type ChallengeTagId} from '@/constants/types';
import { MAX_PRICE_CENTS, MIN_PRICE_CENTS, formatPrice, isValidPriceCents } from '@/utils/price';


// The columns every challenge query asks for, so none of them can forget one (e.g. media_type)
export const CHALLENGE_FIELDS = 'id, title, description, latitude, longitude, start_at, end_at, voting_end_at, radius_m, media_type, price_cents, tags, preview_path';


// FETCH CHALLENGES
// Gets the list of challenges from the database (used when picking which challenge to enter)
export async function fetchChallenges(): Promise<ChallengeLocation[]> {
    // STEP 1: Get challenges that are still open for entries or votes, sorted by title.
    const {data, error} = await supabase
        .from('challenges')
        .select(CHALLENGE_FIELDS)
        .gte('voting_end_at', getChallengeDate())
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
            voting_end_at: challenge.voting_end_at,
            radius_m: Number(challenge.radius_m),
            media_type: challenge.media_type,
            price_cents: Number(challenge.price_cents ?? 0),
            tags: normalizeChallengeTags(challenge.tags),
            preview_path: challenge.preview_path ?? null,
        }]
    })

}


// Challenges this user has submitted a photo to, excluding ones whose voting has closed.
// Querying challenges keeps each challenge in the list once, even with multiple submissions.
export type ParticipatingChallenge = {
    id: string;
    title: string;
    description: string;
    tags: ChallengeTagId[];
    joinedAt: string;
    startAt: string;
    endAt: string;          // last day of entries
    votingEndAt: string;    // last day of voting
};

export async function fetchParticipatingChallenges(): Promise<ParticipatingChallenge[]> {
    const account = await fetchMyAccount();
    if (!account) return [];

    const {data, error} = await supabase
        .from('challenges')
        .select('id, title, description, tags, start_at, end_at, voting_end_at, submissions!inner(account_id, created_at)')
        .eq('submissions.account_id', account.id)
        .gte('voting_end_at', getChallengeDate())
        .order('title')
        .order('created_at', {referencedTable: 'submissions', ascending: true})
        .limit(1, {referencedTable: 'submissions'});

    if (error) throw error;
    return (data ?? []).map((challenge) => ({
        id: challenge.id,
        title: challenge.title,
        description: challenge.description ?? '',
        tags: normalizeChallengeTags(challenge.tags),
        joinedAt: challenge.submissions[0].created_at,
        startAt: challenge.start_at,
        endAt: challenge.end_at,
        votingEndAt: challenge.voting_end_at,
    }));
}


// FETCH ONE CHALLENGE
// Gets a single challenge by its id (used by the individual challenge page).
// Returns null if no challenge has that id, e.g. it was deleted while the app was open.
export async function fetchChallengeById(id: string): Promise<ChallengeLocation | null> {
    // STEP 1: Ask the database for the one row with this id
    //   maybeSingle, not single: a missing row comes back as null instead of an error
    const {data, error} = await supabase
        .from('challenges')
        .select(CHALLENGE_FIELDS)
        .eq('id', id)
        .gte('voting_end_at', getChallengeDate())
        .maybeSingle();

    // STEP 2: Stop here if the request failed
    if (error) throw error;

    // STEP 3: Return the challenge, or null if there is no such id
    return data as ChallengeLocation | null;
}


// NEW CHALLENGE TYPE
// What the user fills in when creating a challenge (the app picks the id).
// Everything here is required, matching the columns the database won't allow to be null.
//   preview_path is left out: the form holds a photo off the phone, and createChallenge
//   uploads it and fills the column in.
export type NewChallenge = Omit<ChallengeLocation, 'id' | 'preview_path'>;


// Includes upcoming, active and ended challenges owned by this account.
export async function fetchCreatedChallenges(): Promise<ChallengeLocation[]> {
    const account = await fetchMyAccount();
    if (!account) return [];
    const {data, error} = await supabase.from('challenges')
        .select(CHALLENGE_FIELDS)
        .eq('creator_account_id', account.id)
        .order('created_at', {ascending: false});
    if (error) throw error;
    return (data ?? []) as ChallengeLocation[];
}

export async function fetchCreatedChallengeById(id: string): Promise<ChallengeLocation> {
    const account = await fetchMyAccount();
    if (!account) throw new Error('Please sign in first.');
    const {data, error} = await supabase.from('challenges')
        .select(CHALLENGE_FIELDS)
        .eq('id', id)
        .eq('creator_account_id', account.id)
        .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('This challenge no longer exists or does not belong to you.');
    return data as ChallengeLocation;
}

export type ChallengeEdits = Partial<Pick<ChallengeLocation,
    'title' | 'description' | 'start_at' | 'end_at' | 'voting_end_at' | 'latitude' | 'longitude' | 'tags'>>;

// Validate against the latest saved challenge, rather than a potentially stale form.
export function validateChallengeEdits(current: ChallengeLocation, edits: ChallengeEdits, today = getChallengeDate()): ChallengeEdits {
    const changes: ChallengeEdits = {};
    if (edits.tags !== undefined) {
        const tags = normalizeChallengeTags(edits.tags);
        if (tags.length < 1 || tags.length > 3 || tags.length !== edits.tags.length) {
            throw new Error('Choose between 1 and 3 valid categories.');
        }
        if (JSON.stringify(tags) !== JSON.stringify(current.tags ?? [])) changes.tags = tags;
    }
    if (edits.title !== undefined && edits.title.trim() !== current.title) {
        const title = edits.title.trim();
        if (!title || title.length > 80) throw new Error('Title must be 1 to 80 characters.');
        changes.title = title;
    }
    if (edits.description !== undefined && edits.description.trim() !== (current.description ?? '')) {
        const description = edits.description.trim();
        if (!description || description.length > 500) throw new Error('Description must be 1 to 500 characters.');
        changes.description = description;
    }
    if (edits.end_at !== undefined && edits.end_at !== current.end_at) {
        if (current.end_at < today) throw new Error('The entry end date cannot change after entries have closed.');
        if (!isValidChallengeDate(edits.end_at) || edits.end_at <= today) throw new Error('The end date must be after today.');
        changes.end_at = edits.end_at;
    }
    if (edits.voting_end_at !== undefined && edits.voting_end_at !== current.voting_end_at) {
        if (current.voting_end_at < today) throw new Error('The voting end date cannot change after voting has closed.');
        if (!isValidChallengeDate(edits.voting_end_at) || edits.voting_end_at < today) throw new Error('The voting end date cannot be in the past.');
        changes.voting_end_at = edits.voting_end_at;
    }
    if ((changes.end_at !== undefined || changes.voting_end_at !== undefined)
        && (changes.voting_end_at ?? current.voting_end_at) <= (changes.end_at ?? current.end_at)) {
        throw new Error('Voting must end after the entry end date.');
    }
    const hasBegun = current.start_at <= today;
    if (edits.start_at !== undefined && edits.start_at !== current.start_at) {
        if (hasBegun) throw new Error('The start date cannot change after the challenge has begun.');
        if (!isValidChallengeDate(edits.start_at) || edits.start_at < today) throw new Error('The start date cannot be in the past.');
        changes.start_at = edits.start_at;
    }
    if ((changes.start_at !== undefined || changes.end_at !== undefined)
        && (changes.end_at ?? current.end_at) < (changes.start_at ?? current.start_at)) {
        throw new Error('The end date cannot be before the start date.');
    }
    const latitude = edits.latitude ?? current.latitude;
    const longitude = edits.longitude ?? current.longitude;
    if (latitude !== current.latitude || longitude !== current.longitude) {
        if (hasBegun) throw new Error('The location cannot change after the challenge has begun.');
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
            || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
            throw new Error('Choose valid latitude and longitude coordinates.');
        }
        changes.latitude = latitude;
        changes.longitude = longitude;
    }
    return changes;
}

export async function updateChallenge(id: string, edits: ChallengeEdits): Promise<ChallengeLocation> {
    const current = await fetchCreatedChallengeById(id);
    const changes = validateChallengeEdits(current, edits);
    if (Object.keys(changes).length === 0) return current;
    const account = await fetchMyAccount();
    if (!account) throw new Error('Please sign in first.');
    const {data, error} = await supabase.from('challenges')
        .update(changes)
        .eq('id', id)
        .eq('creator_account_id', account.id)
        .select(CHALLENGE_FIELDS)
        .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('This challenge no longer exists or does not belong to you.');
    return data as ChallengeLocation;
}

export async function deleteChallenge(id: string): Promise<void> {
    const account = await fetchMyAccount();
    if (!account) throw new Error('Please sign in first.');
    const {data, error} = await supabase.from('challenges')
        .delete()
        .eq('id', id)
        .eq('creator_account_id', account.id)
        .select('id')
        .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('This challenge no longer exists or does not belong to you.');
}


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
// previewUri is the optional preview photo picked off the phone; it's uploaded here, once
// everything else has passed, so a rejected form never leaves a photo behind in storage.
export async function createChallenge(challenge: NewChallenge, previewUri?: string | null): Promise<ChallengeLocation> {
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

    // STEP 2c: All three dates are required (database: not null), must be real dates, not in the past,
    //   the end can't come before the start, and voting ends after entries do.
    //   isValidChallengeDate also rejects a missing or empty date.
    //   YYYY-MM-DD strings sort like dates, so plain < comparisons work
    const {start_at, end_at, voting_end_at} = challenge;
    const today = getChallengeDate();
    if (!start_at || !isValidChallengeDate(start_at)) throw new Error('Pick a valid start date.');
    if (!end_at || !isValidChallengeDate(end_at)) throw new Error('Pick a valid end date.');
    if (!voting_end_at || !isValidChallengeDate(voting_end_at)) throw new Error('Pick a valid voting end date.');
    if (start_at < today) throw new Error('The start date can\'t be in the past.');
    if (end_at < start_at) throw new Error('The end date can\'t be before the start date.');
    //   Voting starts the day after entries close, so it has to end after the entry end date
    if (voting_end_at <= end_at) throw new Error('Voting must end after the entry end date.');

    // STEP 2d: Entries are either photos or videos (database: 'photo' or 'video')
    const {media_type} = challenge;
    if (media_type !== 'photo' && media_type !== 'video') throw new Error('Choose whether entries are photos or videos.');

    // STEP 2e: The entry fee is free or a real amount (database: 0, or 50 to 100000 cents).
    //   The same check runs in the database, so a stale app can't slip an odd price through.
    const {price_cents} = challenge;
    if (!isValidPriceCents(price_cents)) {
        throw new Error(`An entry fee must be free, or between ${formatPrice(MIN_PRICE_CENTS)} and ${formatPrice(MAX_PRICE_CENTS)}.`);
    }

    // STEP 2f: Every challenge must have 1-3 recognised category tags.
    const tags = normalizeChallengeTags(challenge.tags);
    if (tags.length < 1 || tags.length > 3 || tags.length !== (challenge.tags ?? []).length) {
        throw new Error('Choose between 1 and 3 valid categories.');
    }

    // STEP 3: Make sure the user is signed in
    const account = await fetchMyAccount();
    if (!account) throw new Error('Please sign in first.');

    // STEP 4: Make an id that no other challenge is using
    const id = await generateChallengeId(title);

    // STEP 5: Upload the preview photo, if the creator picked one.
    //   Last thing before the insert: everything that can refuse the challenge has run by now.
    const preview_path = previewUri ? await uploadChallengePreview(previewUri) : null;

    // STEP 6: Insert the challenge and ask the database to send the saved row back
    const {data, error} = await supabase
        .from('challenges')
        .insert({id, title, description, latitude, longitude, radius_m, start_at, end_at, voting_end_at, media_type, price_cents, tags, preview_path, creator_account_id: account.id})
        .select(CHALLENGE_FIELDS)
        .single();

    // STEP 7: Stop here if saving failed, deleting the preview photo first so no file
    //   is left in storage that nothing points at
    //   Code 23505 means the id was taken after our check (someone else created a challenge at the same moment)
    if (error) {
        if (preview_path) await deleteChallengePreview(preview_path);
        if (error.code === '23505') throw new Error('Another challenge was just created with a similar name. Please try again.');
        throw error;
    }

    // STEP 8: Return the new challenge, so the app can show it right away
    return data as ChallengeLocation;
}
