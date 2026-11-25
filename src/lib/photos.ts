// SUBMISSION UPLOADS
// Everything the app needs to send a photo or video to Supabase and enter it into a challenge.

// KEY IMPORTS
import { supabase } from '@/lib/supabase';
import { fetchMyAccount } from '@/lib/accounts';
import { fetchAllRows } from '@/lib/fetch-all-rows';
import {formatChallengeDate, getChallengeDate, getChallengePhase} from '@/utils/challenge-dates';
import {distanceInMeters} from '@/utils/distance';
import {getVideoFile, isValidVideoDuration, MAX_VIDEO_BYTES} from '@/utils/media';
import type {ChallengeLocation, MediaType, PhotoLocation} from '@/constants/types';


// Which storage bucket each kind of submission lives in
const BUCKETS: Record<MediaType, string> = {photo: 'photos', video: 'videos'};

// Public web link for a stored submission file
const getMediaUrl = (mediaType: MediaType, path: string) =>
    supabase.storage.from(BUCKETS[mediaType]).getPublicUrl(path).data.publicUrl;


// WHAT'S BEING SUBMITTED
// A photo, or a video with its length (the database needs the length to accept a video)
// and where recording stopped (a video must start AND end inside the challenge's circle)
export type Capture =
    | {mediaType: 'photo'; uri: string}
    | {mediaType: 'video'; uri: string; durationMs: number; endLocation: PhotoLocation | null};


// SUBMISSION ERROR
// Thrown when a photo or video can't be entered (wrong kind for the challenge, too long, too large).
// Its message is written for users, so the app can show it as is.
export class SubmissionError extends Error {}

// CAPTURE LOCATION ERROR
// Thrown when a photo or video can't be entered because of where it was taken (or because we don't know where).
// Its message is written for users, so the app can show it as is.
export class CaptureLocationError extends SubmissionError {}


// TEMPORARY: radius check is turned off, so entries are accepted from anywhere.
//   Set back to true to require photos/videos to be taken inside the challenge's circle again.
const ENFORCE_CAPTURE_RADIUS = false;


// CHECK CAPTURE LOCATION
// Makes sure the photo or video was taken inside the challenge's circle. Throws CaptureLocationError if not.
//   'asserts' tells TypeScript the location is known after this returns
export function checkCaptureLocation(
    challenge: ChallengeLocation,
    location: PhotoLocation | null,
    mediaType: MediaType = 'photo',
): asserts location is PhotoLocation {
    // A location is still required: the database stores where every entry was taken
    if (!location) {
        throw new CaptureLocationError(`We don't know where this ${mediaType} was taken, so it can't be entered. Turn on location and try again.`);
    }
    if (!ENFORCE_CAPTURE_RADIUS) return;
    const distance = distanceInMeters(challenge, location);
    if (distance > challenge.radius_m) {
        throw new CaptureLocationError(
            `This ${mediaType} was taken ${Math.round(distance)} m from the challenge. It must be within ${Math.round(challenge.radius_m)} m.`
        );
    }
}


// UPLOAD A SUBMISSION TO A CHALLENGE
// Takes a photo or video stored on the phone, checks it was taken inside the challenge's circle,
// uploads it, and records it as a submission (with where it was taken; for videos, where recording started).
// Returns the file's public web link.
export async function uploadSubmission(
    capture: Capture,
    challenge: ChallengeLocation,
    location: PhotoLocation | null,
): Promise<string> {
    const challengeId = challenge.id;
    const {mediaType, uri} = capture;

    // STEP 0: Stop before uploading anything if entries aren't open (e.g. the camera stayed open past midnight
    //   on the last day), if the challenge wants the other kind of entry, or if it was taken outside the
    //   challenge area. The database checks the dates and the type too.
    const phase = getChallengePhase(challenge);
    if (phase === 'upcoming') throw new SubmissionError(`Entries open on ${formatChallengeDate(challenge.start_at)}.`);
    if (phase !== 'entry') throw new SubmissionError(`Entries closed on ${formatChallengeDate(challenge.end_at)}.`);
    if (mediaType !== challenge.media_type) {
        throw new SubmissionError(`This challenge only accepts ${challenge.media_type}s.`);
    }
    //   For videos, `location` is where recording started, and the end is checked too,
    //   so nobody can start inside the circle and walk out of it while filming
    checkCaptureLocation(challenge, location, mediaType);
    if (capture.mediaType === 'video') {
        checkCaptureLocation(challenge, capture.endLocation, 'video');
        if (!isValidVideoDuration(capture.durationMs)) throw new SubmissionError('Videos must be between 1 and 30 seconds long.');
    }

    // STEP 1: Get the signed-in user (the app only shows its screens to signed-in users)
    const {data: {session}} = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('Please sign in first.');

    // STEP 2: Work out the file type and its path in storage: <userId>/<challengeId>-<timestamp>.<ext>
    //   Starting with the user's ID is required, since the storage rules only let
    //   users upload into their own folder.
    //   The camera always saves photos as JPEG; videos are .mov on iOS and .mp4 on Android
    const file = mediaType === 'photo'
        ? {extension: 'jpg', contentType: 'image/jpeg'}
        : getVideoFile(uri);
    const filePath = `${user.id}/${challengeId}-${Date.now()}.${file.extension}`;
    const bucket = BUCKETS[mediaType];

    // STEP 3: Read the file off the phone as raw bytes
    //   React Native can't upload a file object directly, so we send the bytes instead.
    //   Videos are capped at 30 s, which keeps them small enough to hold in memory
    const fileBytes = await fetch(uri).then((response) => response.arrayBuffer());
    if (mediaType === 'video' && fileBytes.byteLength > MAX_VIDEO_BYTES) {
        throw new SubmissionError('This video is too large to upload. Try recording a shorter one.');
    }

    // STEP 4: Upload the bytes to the matching storage bucket
    const {error: uploadError} = await supabase.storage
        .from(bucket)
        .upload(filePath, fileBytes, {contentType: file.contentType});
    if (uploadError) throw uploadError;

    // STEP 5: Record the submission in the database (account_id is filled in automatically from the signed-in user's account)
    //   image_path holds the file's path for both photos and videos
    const {error: insertError} = await supabase
        .from('submissions')
        .insert({
            challenge_id: challengeId,
            image_path: filePath,
            media_type: mediaType,
            duration_ms: capture.mediaType === 'video' ? capture.durationMs : null,
            latitude: location.latitude,
            longitude: location.longitude,
        });

    // STEP 6: If saving the submission failed, delete the uploaded file so nothing is left orphaned
    if (insertError) {
        //   Supabase methods resolve with {error} instead of throwing, so check it:
        //   a silent failure here leaves the orphaned file this step exists to prevent
        const {error: removeError} = await supabase.storage.from(bucket).remove([filePath]);
        if (removeError) console.error('Orphaned file left in storage:', filePath, removeError);
        throw insertError;
    }

    // STEP 7: Return the file's public link, so the app can display it later
    return getMediaUrl(mediaType, filePath);
}


// SUBMISSION TYPE
// One photo or video the user has submitted, ready to display
//   imageUrl is the file's public link, for videos too (grids show videos as play tiles, see VideoTile)
export type Submission = {
    id: string
    imageUrl: string
    mediaType: MediaType
    durationMs: number | null   // videos only
    challengeTitle: string
    createdAt: string
}

export type SubmissionPhoto = Pick<Submission, 'id' | 'imageUrl' | 'mediaType' | 'durationMs' | 'createdAt'> & {
    username: string;
    isOwn: boolean;
};

// The user's own entries first, then everyone else's; newest first within each group.
export async function fetchChallengeSubmissions(challengeId: string): Promise<{photos: SubmissionPhoto[]; total: number}> {
    const account = await fetchMyAccount();
    const {data, error, count} = await supabase
        .from('submissions')
        .select('id, image_path, media_type, duration_ms, created_at, account_id, accounts(username)', {count: 'exact'})
        .eq('challenge_id', challengeId)
        .order('created_at', {ascending: false})
        .overrideTypes<{
            id: string;
            image_path: string;
            media_type: MediaType;
            duration_ms: number | null;
            created_at: string;
            account_id: string;
            accounts: {username: string} | null;
        }[], {merge: false}>();
    if (error) throw error;
    const photos = (data ?? []).map((row) => ({
        id: row.id,
        imageUrl: getMediaUrl(row.media_type, row.image_path),
        mediaType: row.media_type,
        durationMs: row.duration_ms,
        createdAt: row.created_at,
        username: row.accounts?.username ?? 'unknown',
        isOwn: row.account_id === account?.id,
    })).sort((a, b) => Number(b.isOwn) - Number(a.isOwn));
    return {photos, total: count ?? photos.length};
}

// FETCH ONE SUBMISSION
// The submission shown on the submission page, or null if it has been deleted.
// Includes its challenge, which voting needs (a vote is one per account per challenge).
// challengeSchedule: the challenge's dates, so the submission page knows whether voting is open
export type SubmissionDetail = SubmissionPhoto & {
    challengeId: string;
    challengeSchedule: Pick<ChallengeLocation, 'start_at' | 'end_at' | 'voting_end_at'>;
};

export async function fetchSubmissionById(submissionId: string): Promise<SubmissionDetail | null> {
    const account = await fetchMyAccount();
    const {data: row, error} = await supabase
        .from('submissions')
        .select('id, challenge_id, image_path, media_type, duration_ms, created_at, account_id, accounts(username), challenges(start_at, end_at, voting_end_at)')
        .eq('id', submissionId)
        .maybeSingle()
        .overrideTypes<{
            id: string;
            challenge_id: string;
            image_path: string;
            media_type: MediaType;
            duration_ms: number | null;
            created_at: string;
            account_id: string;
            accounts: {username: string} | null;
            challenges: Pick<ChallengeLocation, 'start_at' | 'end_at' | 'voting_end_at'>;
        }, {merge: false}>();
    if (error) throw error;
    if (!row) return null;
    return {
        id: row.id,
        challengeId: row.challenge_id,
        challengeSchedule: row.challenges,
        imageUrl: getMediaUrl(row.media_type, row.image_path),
        mediaType: row.media_type,
        durationMs: row.duration_ms,
        createdAt: row.created_at,
        username: row.accounts?.username ?? 'unknown',
        isOwn: row.account_id === account?.id,
    };
}

// SUBMISSION STATS ROW
// What the stats page needs from each submission: who made it, when, and its file for the top 3
export type SubmissionStatsRow = Pick<Submission, 'id' | 'imageUrl' | 'mediaType' | 'durationMs' | 'createdAt'> & {
    accountId: string
    username: string
};

// FETCH SUBMISSION STATS ROWS
// Every submission in one challenge, oldest first. Used by the stats page (src/lib/challenge-stats.ts).
//   All of them, not just the first 1000, since the chart and totals count every one
export async function fetchSubmissionStatsRows(challengeId: string): Promise<SubmissionStatsRow[]> {
    type Row = {
        id: string;
        image_path: string;
        media_type: MediaType;
        duration_ms: number | null;
        created_at: string;
        account_id: string;
        accounts: {username: string} | null;
    };
    const rows = await fetchAllRows<Row>((from, to) => supabase
        .from('submissions')
        .select('id, image_path, media_type, duration_ms, created_at, account_id, accounts(username)')
        .eq('challenge_id', challengeId)
        .order('created_at', {ascending: true})
        .order('id', {ascending: true})   // tie-breaker, so the pages never overlap
        .range(from, to)
        .overrideTypes<Row[], {merge: false}>());

    return rows.map((row) => ({
        id: row.id,
        imageUrl: getMediaUrl(row.media_type, row.image_path),
        mediaType: row.media_type,
        durationMs: row.duration_ms,
        createdAt: row.created_at,
        accountId: row.account_id,
        username: row.accounts?.username ?? 'unknown',
    }));
}

// FETCH MY SUBMISSIONS
// Gets every photo and video the signed-in user has submitted, newest first (used by the gallery)
export async function fetchMySubmissions(): Promise<Submission[]> {
    // STEP 1: Get the signed-in user's account
    const account = await fetchMyAccount();
    if (!account) return [];

    // STEP 2: Ask the database for this user's submissions,
    //   including each one's challenge title (joined through challenge_id)
    const {data, error} = await supabase
        .from('submissions')
        .select('id, image_path, media_type, duration_ms, created_at, challenges!inner(title)')
        .gte('challenges.voting_end_at', getChallengeDate())
        .eq('account_id', account.id)
        .order('created_at', {ascending: false});

    // STEP 3: Stop here if the request failed
    if (error) throw error;

    // STEP 4: Turn each row into something the gallery can display,
    //   converting the storage path into a public image link
    return (data ?? []).map((row: any) => ({
        id: row.id,
        imageUrl: getMediaUrl(row.media_type, row.image_path),
        mediaType: row.media_type,
        durationMs: row.duration_ms,
        challengeTitle: row.challenges?.title ?? 'Unknown challenge',
        createdAt: row.created_at,
    }));
}
