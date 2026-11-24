// ZOOMABLE IMAGE
// One submission photo on a white stage, fitted inside the space it is given so the whole
// photo shows. Pinch to zoom; drag to move around while zoomed. Pinch back in to return to normal size.
// A double tap is passed up to the page (onDoubleTap).
// This is the old pop-up photo viewer's layout, now placed at the top of the submission page.
//
// Because it sits in a scrolling page, it reports when it is zoomed (onZoomChange):
// the page stops scrolling then, and a one-finger drag moves the photo instead.

import {useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {Image} from 'expo-image';
import {GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture} from 'react-native-gesture-handler';
import Animated, {useAnimatedReaction, useAnimatedStyle, useDerivedValue, useSharedValue} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import {theme} from '@/constants/theme';
import {boundImageOffset, fitImage} from '@/utils/image-viewer';

const MAX_ZOOM = 8;
// Letting go this close to normal size snaps back to it, so the page isn't left unable to scroll
const SNAP_BACK_BELOW = 1.1;

type Props = {
    imageUrl: string;
    width: number;                              // the stage's size: normally the screen width...
    height: number;                             // ...and the height of the page below its header
    onZoomChange?: (zoomed: boolean) => void;   // true while zoomed in or mid-pinch
    onDoubleTap?: () => void;                   // two quick taps on the photo (the page uses this to vote)
};

export default function ZoomableImage({imageUrl, width, height: availableHeight, onZoomChange, onDoubleTap}: Props) {
    const height = Math.max(1, availableHeight);
    const [naturalSize, setNaturalSize] = useState<{width: number; height: number} | null>(null);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const image = naturalSize ? fitImage(naturalSize.width, naturalSize.height, width, height) : {width, height};
    const scale = useSharedValue(1);
    const x = useSharedValue(0);
    const y = useSharedValue(0);
    const startScale = useSharedValue(1);
    const anchorX = useSharedValue(0);
    const anchorY = useSharedValue(0);
    const pinching = useSharedValue(false);

    // Dragging only moves the photo while it is zoomed; otherwise the touch belongs to the page's scrolling
    const canDrag = useDerivedValue(() => scale.get() > 1);

    useAnimatedReaction(
        () => scale.get() > 1 || pinching.get(),
        (next, previous) => {
            if (onZoomChange && next !== previous && previous !== null) scheduleOnRN(onZoomChange, next);
        },
    );

    const pinch = usePinchGesture({
        enabled: !!naturalSize && !error,
        onActivate: (event) => {
            pinching.set(true);
            startScale.set(scale.get());
            anchorX.set((event.focalX - width / 2 - x.get()) / scale.get());
            anchorY.set((event.focalY - height / 2 - y.get()) / scale.get());
        },
        onUpdate: (event) => {
            const next = Math.max(1, Math.min(MAX_ZOOM, startScale.get() * event.scale));
            scale.set(next);
            x.set(boundImageOffset(event.focalX - width / 2 - anchorX.get() * next, image.width, width, next));
            y.set(boundImageOffset(event.focalY - height / 2 - anchorY.get() * next, image.height, height, next));
        },
        onFinalize: () => {
            if (scale.get() < SNAP_BACK_BELOW) {
                scale.set(1);
                x.set(0);
                y.set(0);
            }
            pinching.set(false);
        },
    });
    const pan = usePanGesture({
        enabled: canDrag,
        averageTouches: true,
        onUpdate: (event) => {
            if (event.numberOfPointers !== 1) return;
            x.set(boundImageOffset(x.get() + event.changeX, image.width, width, scale.get()));
            y.set(boundImageOffset(y.get() + event.changeY, image.height, height, scale.get()));
        },
    });
    // Double tap doesn't zoom; it just tells the page.
    //   runOnJS: the page's handler is ordinary app code, so it must run on the app's own thread
    const doubleTap = useTapGesture({
        enabled: !!onDoubleTap,
        numberOfTaps: 2,
        runOnJS: true,
        onActivate: () => onDoubleTap?.(),
    });
    const gestures = useSimultaneousGestures(pinch, pan, doubleTap);
    const transform = useAnimatedStyle(() => ({transform: [{translateX: x.get()}, {translateY: y.get()}, {scale: scale.get()}]}));

    return (
        <View style={[styles.stage, {width, height: availableHeight}]}>
            <GestureDetector gesture={gestures}>
                <View style={[styles.canvas, {width, height}]} collapsable={false}>
                    <Animated.View style={[styles.fill, transform]}>
                        <Image
                            key={attempt}
                            source={{uri: imageUrl}}
                            style={styles.fill}
                            contentFit="contain"
                            allowDownscaling={false}
                            accessibilityLabel="Full submission photo"
                            onLoad={({source}) => {if (source.width > 0 && source.height > 0) setNaturalSize({width: source.width, height: source.height});}}
                            onError={() => setError(true)}
                        />
                    </Animated.View>
                </View>
            </GestureDetector>
            {!naturalSize && !error && <ActivityIndicator style={styles.loading} color={theme.colors.active} accessibilityLabel="Loading photo" />}
            {error && (
                <View style={styles.error}>
                    <Text style={styles.message}>Could not load this photo.</Text>
                    <Pressable accessibilityRole="button" style={styles.retry} onPress={() => {setError(false); setNaturalSize(null); setAttempt((value) => value + 1);}}>
                        <Text style={styles.link}>Try again</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    fill: {flex: 1},
    stage: {overflow: 'hidden', backgroundColor: '#FFFFFF'},
    message: {color: theme.colors.text, fontSize: 16},
    link: {color: theme.colors.active, fontSize: 16, fontWeight: '600'},
    canvas: {overflow: 'hidden'},
    loading: {...StyleSheet.absoluteFill},
    error: {...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'},
    retry: {minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12},
});
