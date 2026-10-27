// PHOTO UPLOADS
// Everything the app needs to send a photo to Supabase and enter it into a challenge.

// KEY IMPORTS
import { supabase } from '@/lib/supabase';


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
