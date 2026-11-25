// CHALLENGE PREVIEW PHOTOS
// The optional picture a creator attaches to a challenge, so the map card can show the spot
// before anyone opens the challenge.
//
// Kept apart from photos.ts: a preview is one photo the creator picks from their library when
// making the challenge, not an entry anyone submits to it. Nothing here checks where the photo
// was taken, and a preview is never a submission.

// KEY IMPORTS
import { supabase } from '@/lib/supabase';
import { MAX_PREVIEW_BYTES, getPreviewFile } from '@/utils/media';


// Where preview photos live. Public, so the card can show one from its link.
const PREVIEW_BUCKET = 'challenge-previews';


// PREVIEW PHOTO ERROR
// Thrown when a chosen photo can't be used (wrong format, too large).
// Its message is written for users, so the app can show it as is.
export class PreviewPhotoError extends Error {}


// PUBLIC LINK FOR A PREVIEW
// Turns a stored path into a web link, or null when the challenge has no preview.
// Takes null and undefined so screens can hand it a challenge's preview_path directly.
export function getPreviewUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    return supabase.storage.from(PREVIEW_BUCKET).getPublicUrl(path).data.publicUrl;
}


// UPLOAD A PREVIEW PHOTO
// Sends a photo picked from the library to storage and returns its path, which the caller
// saves as challenges.preview_path. Nothing links the file to a challenge yet, so a caller
// whose insert then fails should remove it with deleteChallengePreview.
export async function uploadChallengePreview(uri: string): Promise<string> {
    // STEP 1: Make sure it's a format the bucket accepts, before reading the file at all
    const file = getPreviewFile(uri);
    if (!file) throw new PreviewPhotoError('A preview photo must be a JPEG, PNG or WebP image.');

    // STEP 2: Get the signed-in user. The path has to start with their id,
    //   since the storage rules only let users upload into their own folder.
    const {data: {session}} = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('Please sign in first.');

    // STEP 3: Read the photo off the phone as raw bytes
    //   React Native can't upload a file object directly, so we send the bytes instead.
    //   The bucket rejects anything over 5 MiB, so check it here and say why.
    const fileBytes = await fetch(uri).then((response) => response.arrayBuffer());
    if (fileBytes.byteLength > MAX_PREVIEW_BYTES) {
        throw new PreviewPhotoError('This photo is too large. Pick one under 5 MB.');
    }

    // STEP 4: Upload the bytes: <userId>/preview-<timestamp>.<ext>
    const filePath = `${user.id}/preview-${Date.now()}.${file.extension}`;
    const {error: uploadError} = await supabase.storage
        .from(PREVIEW_BUCKET)
        .upload(filePath, fileBytes, {contentType: file.contentType});
    if (uploadError) throw uploadError;

    // STEP 5: Return the path, for the challenge row to point at
    return filePath;
}


// DELETE A PREVIEW PHOTO
// Used to clean up after a failed save, so an uploaded photo no challenge points at
// isn't left behind. Reports a failure rather than throwing: whatever went wrong before
// this is the thing worth showing the user.
export async function deleteChallengePreview(path: string): Promise<void> {
    const {error} = await supabase.storage.from(PREVIEW_BUCKET).remove([path]);
    if (error) console.error('Orphaned preview photo left in storage:', path, error);
}
