export function fitImage(width: number, height: number, viewportWidth: number, viewportHeight: number) {
    const ratio = Math.min(viewportWidth / width, viewportHeight / height);
    return {width: width * ratio, height: height * ratio};
}

// Keep the image covering the viewport on each axis where it is larger.
export function boundImageOffset(offset: number, imageSize: number, viewportSize: number, scale: number) {
    'worklet';
    const limit = Math.max(0, (imageSize * scale - viewportSize) / 2);
    return Math.max(-limit, Math.min(offset, limit));
}
