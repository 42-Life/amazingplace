// Tests for src/utils/media.ts (file types and limits for photo and video submissions).
// Node loads the TypeScript file directly, since it has no imports.
const test = require('node:test');
const assert = require('node:assert/strict');
const {getVideoFile, isValidVideoDuration, MAX_VIDEO_BYTES, MAX_VIDEO_DURATION_MS} = require('../src/utils/media.ts');

test('iOS .mov recordings upload as QuickTime', () => {
    assert.deepEqual(getVideoFile('file:///var/mobile/Containers/Data/Library/Caches/Camera/ABC.mov'),
        {extension: 'mov', contentType: 'video/quicktime'});
    assert.deepEqual(getVideoFile('file:///tmp/clip.MOV'), {extension: 'mov', contentType: 'video/quicktime'});
});

test('Android .mp4 recordings upload as MPEG-4', () => {
    assert.deepEqual(getVideoFile('file:///data/user/0/app/cache/Camera/abc.mp4'),
        {extension: 'mp4', contentType: 'video/mp4'});
});

test('query strings and fragments are ignored when reading the extension', () => {
    assert.equal(getVideoFile('file:///tmp/clip.mov?token=1.mp4').extension, 'mov');
    assert.equal(getVideoFile('file:///tmp/clip.mov#t=1').extension, 'mov');
});

test('unknown or missing extensions fall back to mp4', () => {
    assert.equal(getVideoFile('file:///tmp/clip').extension, 'mp4');
    assert.equal(getVideoFile('file:///tmp.dir/clip').extension, 'mp4');
});

test('video durations match the database limit (1 ms to 31 s)', () => {
    assert.equal(isValidVideoDuration(1), true);
    assert.equal(isValidVideoDuration(30_000), true);
    assert.equal(isValidVideoDuration(MAX_VIDEO_DURATION_MS), true);
    assert.equal(isValidVideoDuration(MAX_VIDEO_DURATION_MS + 1), false);
    assert.equal(isValidVideoDuration(0), false);
    assert.equal(isValidVideoDuration(1500.5), false);
    assert.equal(isValidVideoDuration(Number.NaN), false);
});

test('size limit matches the videos bucket (50 MiB)', () => {
    assert.equal(MAX_VIDEO_BYTES, 52428800);
});

const {getPreviewFile, MAX_PREVIEW_BYTES} = require('../src/utils/media.ts');

test('preview photos upload as the format they were picked in', () => {
    assert.deepEqual(getPreviewFile('file:///tmp/ImagePicker/abc.jpg'), {extension: 'jpg', contentType: 'image/jpeg'});
    assert.deepEqual(getPreviewFile('file:///tmp/abc.JPEG'), {extension: 'jpg', contentType: 'image/jpeg'});
    assert.deepEqual(getPreviewFile('file:///tmp/abc.png'), {extension: 'png', contentType: 'image/png'});
    assert.deepEqual(getPreviewFile('file:///tmp/abc.webp'), {extension: 'webp', contentType: 'image/webp'});
});

test('formats the previews bucket refuses are rejected before uploading', () => {
    assert.equal(getPreviewFile('file:///tmp/IMG_0001.heic'), null);   // an iPhone original, if the editor is ever skipped
    assert.equal(getPreviewFile('file:///tmp/clip.mp4'), null);
    assert.equal(getPreviewFile('file:///tmp/photo'), null);
    assert.equal(getPreviewFile('file:///tmp.dir/photo'), null);
});

test('query strings and fragments are ignored when reading a photo extension', () => {
    assert.equal(getPreviewFile('file:///tmp/abc.png?token=1.heic').extension, 'png');
    assert.equal(getPreviewFile('file:///tmp/abc.png#1').extension, 'png');
});

test('preview size limit matches the challenge-previews bucket (5 MiB)', () => {
    assert.equal(MAX_PREVIEW_BYTES, 5242880);
});

const {getRecordedDurationMs, formatDuration, MAX_RECORDING_BYTES} = require('../src/utils/media.ts');

test('recorded length prefers the recorder progress over elapsed time', () => {
    assert.equal(getRecordedDurationMs(12.4, 13_100), 12_400);
});

test('recorded length falls back to elapsed time when no progress arrived', () => {
    assert.equal(getRecordedDurationMs(0, 2_345.6), 2_346);
});

test('recorded length stays between 1 ms and 30 s', () => {
    assert.equal(getRecordedDurationMs(30.4, 31_000), 30_000);
    assert.equal(getRecordedDurationMs(0, 0), 1);
    assert.equal(getRecordedDurationMs(Number.NaN, Number.NaN), 1);
});

test('recording size cap leaves room under the bucket limit', () => {
    assert.ok(MAX_RECORDING_BYTES < MAX_VIDEO_BYTES);
});

test('durations show as m:ss', () => {
    assert.equal(formatDuration(0), '0:00');
    assert.equal(formatDuration(7.9), '0:07');
    assert.equal(formatDuration(30), '0:30');
    assert.equal(formatDuration(75), '1:15');
    assert.equal(formatDuration(-3), '0:00');
    assert.equal(formatDuration(Number.NaN), '0:00');
});
