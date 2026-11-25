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

// A challenge's preview photo can be at most this big. Matches the "challenge-previews" bucket's limit (5 MiB).
export const MAX_PREVIEW_BYTES = 5 * 1024 * 1024;

export type PreviewFile = {extension: 'jpg' | 'png' | 'webp'; contentType: 'image/jpeg' | 'image/png' | 'image/webp'};

// The formats the "challenge-previews" bucket accepts, by the extension of the file picked.
const PREVIEW_FILES: Record<string, PreviewFile> = {
    jpg: {extension: 'jpg', contentType: 'image/jpeg'},
    jpeg: {extension: 'jpg', contentType: 'image/jpeg'},
    png: {extension: 'png', contentType: 'image/png'},
    webp: {extension: 'webp', contentType: 'image/webp'},
};

// PREVIEW FILE TYPE
// Reads the format of a photo picked from the library, the same way getVideoFile reads a recording's.
// Returns null for anything the bucket would refuse, so the app can say so before uploading.
export function getPreviewFile(uri: string): PreviewFile | null {
    const path = uri.split(/[?#]/)[0];
    const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
    return PREVIEW_FILES[extension] ?? null;
}

// VIDEO DURATION CHECK
// True when a recording's length is one the database will accept (more than 0, up to 31 s).
export function isValidVideoDuration(durationMs: number): boolean {
    return Number.isInteger(durationMs) && durationMs >= 1 && durationMs <= MAX_VIDEO_DURATION_MS;
}

// The camera stops recording at this size, leaving room under the bucket's 50 MiB limit
// (the recorder can run slightly past the size it's given before it stops)
export const MAX_RECORDING_BYTES = 45 * 1024 * 1024;

// RECORDED LENGTH
// The camera doesn't report a finished video's length, so work it out from what we saw while recording:
// the recorder's last progress report (seconds) if there was one, otherwise the time between start and stop.
// Kept between 1 ms and the 30 s limit, since the recorder stops itself at 30 s.
export function getRecordedDurationMs(lastProgressS: number, elapsedMs: number): number {
    const measured = lastProgressS > 0 ? lastProgressS * 1000 : elapsedMs;
    if (!Number.isFinite(measured)) return 1;
    return Math.min(Math.max(Math.round(measured), 1), MAX_VIDEO_DURATION_S * 1000);
}

// DURATION LABEL
// Seconds shown as m:ss, e.g. 7 → "0:07", 30 → "0:30"
export function formatDuration(seconds: number): string {
    const whole = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
