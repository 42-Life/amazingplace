// MEDIA RULES
// Limits and file details shared by photo and video submissions.
// No imports, so these can be unit-tested without the app.

// Videos can be at most this long. Matches the database check (31 s, which allows for recorder slack).
export const MAX_VIDEO_DURATION_S = 30;

// Videos can be at most this big. Matches the "videos" storage bucket's limit (50 MiB).
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

// The longest duration the database accepts, in milliseconds (see submissions_duration_ms_check)
export const MAX_VIDEO_DURATION_MS = 31_000;

export type VideoFile = {extension: 'mov' | 'mp4'; contentType: 'video/quicktime' | 'video/mp4'};

// VIDEO FILE TYPE
// iOS records QuickTime (.mov) and Android records MPEG-4 (.mp4).
// Reads the extension from the file's address, ignoring any ?query or #fragment.
// Anything that isn't .mov is treated as .mp4, the format the "videos" bucket accepts besides .mov.
export function getVideoFile(uri: string): VideoFile {
    const path = uri.split(/[?#]/)[0];
    const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
    return extension === 'mov'
        ? {extension: 'mov', contentType: 'video/quicktime'}
        : {extension: 'mp4', contentType: 'video/mp4'};
}

// VIDEO DURATION CHECK
// True when a recording's length is one the database will accept (more than 0, up to 31 s).
export function isValidVideoDuration(durationMs: number): boolean {
    return Number.isInteger(durationMs) && durationMs >= 1 && durationMs <= MAX_VIDEO_DURATION_MS;
}
