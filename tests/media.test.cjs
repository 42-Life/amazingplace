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
