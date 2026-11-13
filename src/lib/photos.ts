// PHOTO UPLOADS
// Everything the app needs to send a photo to Supabase and enter it into a challenge.

// KEY IMPORTS
import { supabase } from '@/lib/supabase';
import { fetchMyAccount } from '@/lib/accounts';
import {getChallengeDate} from '@/utils/challenge-dates';
import {distanceInMeters} from '@/utils/distance';
import type {ChallengeLocation, PhotoLocation} from '@/constants/types';


// PHOTO LOCATION ERROR
// Thrown when a photo can't be entered because of where it was taken (or because we don't know where).
// Its message is written for users, so the app can show it as is.
export class PhotoLocationError extends Error {}


// CHECK PHOTO LOCATION
// Makes sure the photo was taken inside the challenge's circle. Throws PhotoLocationError if not.
//   'asserts' tells TypeScript the location is known after this returns
export function checkPhotoLocation(challenge: ChallengeLocation, location: PhotoLocation | null): asserts location is PhotoLocation {
    if (!location) {
        throw new PhotoLocationError("We don't know where this photo was taken, so it can't be entered. Turn on location and try again.");
    }
    const distance = distanceInMeters(challenge, location);
    if (distance > challenge.radius_m) {
        throw new PhotoLocationError(
            `This photo was taken ${Math.round(distance)} m from the challenge. It must be within ${Math.round(challenge.radius_m)} m.`
        );
    }
}


// UPLOAD PHOTO TO A CHALLENGE
// Takes a photo stored on the phone, checks it was taken inside the challenge's circle,
// uploads it, and records it as a submission (with where it was taken).
// Returns the photo's public web link.
export async function uploadPhotoToChallenge(
    localUri: string,
    challenge: ChallengeLocation,
    location: PhotoLocation | null,
): Promise<string> {
    const challengeId = challenge.id;

    // STEP 0: Stop before uploading anything if the photo is outside the challenge area
    checkPhotoLocation(challenge, location);

    // STEP 1: Get the signed-in user (the app only shows its screens to signed-in users)
    const {data: {session}} = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('Please sign in first.');

    // STEP 2: Build the file's path in storage: <userId>/<challengeId>-<timestamp>.jpg
    //   Starting with the user's ID is required, since the storage rules only let
    //   users upload into their own folder
    const filePath = `${user.id}/${challengeId}-${Date.now()}.jpg`;

    // STEP 3: Read the photo off the phone as raw bytes
    //   React Native can't upload a file object directly, so we send the bytes instead
    const fileBytes = await fetch(localUri).then((response) => response.arrayBuffer());

    // STEP 4: Upload the bytes to the "photos" storage bucket
    const {error: uploadError} = await supabase.storage
        .from('photos')
        .upload(filePath, fileBytes, {contentType: 'image/jpeg'});   // the camera always saves JPEG
    if (uploadError) throw uploadError;

    // STEP 5: Record the submission in the database (account_id is filled in automatically from the signed-in user's account)
    const {error: insertError} = await supabase
        .from('submissions')
        .insert({challenge_id: challengeId, image_path: filePath, latitude: location.latitude, longitude: location.longitude});

    // STEP 6: If saving the submission failed, delete the uploaded file so nothing is left orphaned
    if (insertError) {
        //   Supabase methods resolve with {error} instead of throwing, so check it:
        //   a silent failure here leaves the orphaned file this step exists to prevent
        const {error: removeError} = await supabase.storage.from('photos').remove([filePath]);
        if (removeError) console.error('Orphaned file left in storage:', filePath, removeError);
        throw insertError;
    }

    // STEP 7: Return the photo's public link, so the app can display it later
    const {data} = supabase.storage.from('photos').getPublicUrl(filePath);
    return data.publicUrl;
}


// SUBMISSION TYPE
// One photo the user has submitted, ready to display
export type Submission = {
    id: string
    imageUrl: string
    challengeTitle: string
    createdAt: string
}

// FETCH MY SUBMISSIONS
// Gets every photo the signed-in user has submitted, newest first (used by the gallery)
export async function fetchMySubmissions(): Promise<Submission[]> {
    // STEP 1: Get the signed-in user's account
    const account = await fetchMyAccount();
    if (!account) return [];

    // STEP 2: Ask the database for this user's submissions,
    //   including each one's challenge title (joined through challenge_id)
    const {data, error} = await supabase
        .from('submissions')
        .select('id, image_path, created_at, challenges!inner(title)')
        .gte('challenges.end_at', getChallengeDate())
        .eq('account_id', account.id)
        .order('created_at', {ascending: false});

    // STEP 3: Stop here if the request failed
    if (error) throw error;

    // STEP 4: Turn each row into something the gallery can display,
    //   converting the storage path into a public image link
    return (data ?? []).map((row: any) => ({
        id: row.id,
        imageUrl: supabase.storage.from('photos').getPublicUrl(row.image_path).data.publicUrl,
        challengeTitle: row.challenges?.title ?? 'Unknown challenge',
        createdAt: row.created_at,
    }));
}
