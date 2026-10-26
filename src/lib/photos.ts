// PHOTO UPLOADS
// Everything the app needs to send a photo to Supabase and enter it into a challenge.

// KEY IMPORTS
import {supabase} from '@/lib/supabase';
import type {ChallengeLocation} from '@/constants/types';


// FETCH CHALLENGES
// Gets the list of challenges from the database (used when picking which challenge to enter)
// export async function fetchChallenges(): Promise<ChallengeLocation[]> {
//     // STEP 1: Ask the database for every challenge, sorted by title
//     const {data, error} = await supabase
//         .from('challenges')
//         .select('id, title, description, latitude, longitude')
//         .order('title');
//
//     // TEMP STEP (1B): Log results of supabase query for developer side
//     console.log("Supabase error", error);
//     console.log("Challenges returned:", data);
//
//     // STEP 2: Stop here if the request failed
//     if (error) throw error;
//
//     // STEP 3: Return the list (an empty list if there are none yet)
//     // return (data ?? []) as ChallengeLocation[];
//     return (data ?? []).map((challenge) => {
//         const latitude = Number(challenge.latitude);
//         const longitude = Number(challenge.longitude);
//
//         if (
//             !Number.isFinite(latitude) || !Number.isFinite(longitude)
//             || latitude < -90 || latitude > 90
//             || longitude < -180 || longitude > 180
//         ) {
//             throw new Error(`Invalid coordinates for challenge: ${challenge.id}`)
//         }
//
//         return {
//             id: String(challenge.id),
//             title: challenge.title,
//             description: challenge.description,
//             latitude, longitude,
//         }
//     })
//
// }

export async function fetchChallenges(): Promise<ChallengeLocation[]> {
    try {
        // STEP 1: Ask the database for every challenge, sorted by title
        const {data, error} = await supabase
            .from('challenges')
            .select('id, title, description, latitude, longitude')
            .order('title');

        // STEP 2: Log the query results for debugging
        console.log("Supabase error:", error);
        console.log("Challenges returned:", data);

        // STEP 3: Throw an error if the query failed
        if (error) {
            throw error;
        }

        // STEP 4: Validate and convert the returned data
        const challenges: ChallengeLocation[] = (data ?? []).map((challenge) => {
            // Reject missing coordinates before converting them to numbers
            if (
                challenge.latitude == null ||
                challenge.longitude == null
            ) {
                throw new Error(
                    `Missing coordinates for challenge: ${challenge.id}`
                );
            }

            const latitude = Number(challenge.latitude);
            const longitude = Number(challenge.longitude);

            // Check that the coordinates are valid
            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude) ||
                latitude < -90 ||
                latitude > 90 ||
                longitude < -180 ||
                longitude > 180
            ) {
                throw new Error(
                    `Invalid coordinates for challenge: ${challenge.id}`
                );
            }

            return {
                id: String(challenge.id),
                title: challenge.title,
                description: challenge.description,
                latitude,
                longitude,
            };
        });

        // STEP 5: Return the validated challenges
        return challenges;

    } catch (err) {
        // STEP 6: Log the error and pass it to the calling function
        console.error("Error fetching challenges:", err);
        throw err;

    } finally {
        // STEP 7: Runs whether the function succeeds or fails
        console.log("Finished fetching challenges from Supabase.");
    }
}


// UPLOAD PHOTO TO A CHALLENGE
// Takes a photo stored on the phone, uploads it, and records it as a submission.
// Returns the photo's public web link.
export async function uploadPhotoToChallenge(localUri: string, challengeId: string, mimeType = 'image/jpeg'): Promise<string> {
    // STEP 1: Get the signed-in user (every phone is signed in anonymously on launch)
    const {data: {session}} = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('Not signed in yet. Try closing and reopening the app.');

    // STEP 2: Build the file's path in storage: <userId>/<challengeId>-<timestamp>.<ext>
    //   Starting with the user's ID is required, since the storage rules only let
    //   users upload into their own folder
    const extension = mimeType.split('/')[1] ?? 'jpg';
    const filePath = `${user.id}/${challengeId}-${Date.now()}.${extension}`;

    // STEP 3: Read the photo off the phone as raw bytes
    //   React Native can't upload a file object directly, so we send the bytes instead
    const fileBytes = await fetch(localUri).then((response) => response.arrayBuffer());

    // STEP 4: Upload the bytes to the "photos" storage bucket
    const {error: uploadError} = await supabase.storage
        .from('photos')
        .upload(filePath, fileBytes, {contentType: mimeType});
    if (uploadError) throw uploadError;

    // STEP 5: Record the submission in the database (user_id is filled in automatically)
    const {error: insertError} = await supabase
        .from('submissions')
        .insert({challenge_id: challengeId, image_path: filePath});

    // STEP 6: If saving the submission failed, delete the uploaded file so nothing is left orphaned
    if (insertError) {
        await supabase.storage.from('photos').remove([filePath]);
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
    // STEP 1: Get the signed-in user
    const {data: {session}} = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return [];

    // STEP 2: Ask the database for this user's submissions,
    //   including each one's challenge title (joined through challenge_id)
    const {data, error} = await supabase
        .from('submissions')
        .select('id, image_path, created_at, challenges(title)')
        .eq('user_id', user.id)
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
