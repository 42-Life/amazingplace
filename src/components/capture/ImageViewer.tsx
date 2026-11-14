import {useState} from 'react';
import {ActivityIndicator, Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {Image} from 'expo-image';
import {Ionicons} from '@expo/vector-icons';
import {GestureDetector, GestureHandlerRootView, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture} from 'react-native-gesture-handler';
import Animated, {useAnimatedStyle, useSharedValue} from 'react-native-reanimated';
import {boundImageOffset, fitImage} from '@/utils/image-viewer';

const MAX_ZOOM = 8;

// Kept separate from the gallery so photo actions can be added here later.
export default function ImageViewer({imageUrl, onClose}: {imageUrl: string; onClose: () => void}) {
    const [viewport, setViewport] = useState({width: 0, height: 0});

    return (
        <Modal visible animationType="fade" presentationStyle="fullScreen" supportedOrientations={['portrait', 'landscape']} onRequestClose={onClose}>
            <GestureHandlerRootView style={styles.fill}>
                <SafeAreaProvider>
                    <SafeAreaView style={styles.safe}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Photo</Text>
                            <Pressable accessibilityRole="button" accessibilityLabel="Close photo" onPress={onClose} style={styles.control}>
                                <Ionicons name="close" size={28} color="#FFFFFF" />
                            </Pressable>
                        </View>
                        <View style={styles.stage} onLayout={({nativeEvent: {layout}}) => setViewport({width: layout.width, height: layout.height})}>
                            {viewport.width > 0 && viewport.height > 0 && (
                                <ZoomableImage key={`${imageUrl}:${viewport.width}:${viewport.height}`} imageUrl={imageUrl} {...viewport} />
                            )}
                        </View>
                    </SafeAreaView>
                </SafeAreaProvider>
            </GestureHandlerRootView>
        </Modal>
    );
}

function ZoomableImage({imageUrl, width, height: availableHeight}: {imageUrl: string; width: number; height: number}) {
    const height = Math.max(1, availableHeight - 72);
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

    const pinch = usePinchGesture({
        enabled: !!naturalSize && !error,
        onActivate: (event) => {
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
    });
    const pan = usePanGesture({
        enabled: !!naturalSize && !error,
        averageTouches: true,
        onUpdate: (event) => {
            if (event.numberOfPointers !== 1) return;
            x.set(boundImageOffset(x.get() + event.changeX, image.width, width, scale.get()));
            y.set(boundImageOffset(y.get() + event.changeY, image.height, height, scale.get()));
        },
    });
    const doubleTap = useTapGesture({
        enabled: !!naturalSize && !error,
        numberOfTaps: 2,
        onActivate: (event) => {
            const next = scale.get() > 1 ? 1 : 3;
            x.set(boundImageOffset((width / 2 - event.x) * (next - 1), image.width, width, next));
            y.set(boundImageOffset((height / 2 - event.y) * (next - 1), image.height, height, next));
            scale.set(next);
        },
    });
    const gestures = useSimultaneousGestures(pinch, pan, doubleTap);
    const transform = useAnimatedStyle(() => ({transform: [{translateX: x.get()}, {translateY: y.get()}, {scale: scale.get()}]}));

    function zoom(multiplier: number) {
        const next = Math.max(1, Math.min(MAX_ZOOM, scale.get() * multiplier));
        x.set(boundImageOffset(x.get(), image.width, width, next));
        y.set(boundImageOffset(y.get(), image.height, height, next));
        scale.set(next);
    }

    return (
        <>
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
            {!naturalSize && !error && <ActivityIndicator style={styles.loading} color="#FFFFFF" accessibilityLabel="Loading photo" />}
            {error && (
                <View style={styles.error}>
                    <Text style={styles.white}>Could not load this photo.</Text>
                    <Pressable accessibilityRole="button" style={styles.control} onPress={() => {setError(false); setNaturalSize(null); setAttempt((value) => value + 1);}}>
                        <Text style={styles.white}>Try again</Text>
                    </Pressable>
                </View>
            )}
            <View style={styles.controls}>
                <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" style={styles.control} onPress={() => zoom(1 / 1.5)} disabled={!naturalSize || error}>
                    <Ionicons name="remove" size={24} color="#FFFFFF" />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Reset photo zoom" style={styles.control} onPress={() => {scale.set(1); x.set(0); y.set(0);}}>
                    <Text style={styles.white}>Reset</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" style={styles.control} onPress={() => zoom(1.5)} disabled={!naturalSize || error}>
                    <Ionicons name="add" size={24} color="#FFFFFF" />
                </Pressable>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    fill: {flex: 1},
    safe: {flex: 1, backgroundColor: '#000000'},
    header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16},
    title: {color: '#FFFFFF', fontSize: 18, fontWeight: '600'},
    white: {color: '#FFFFFF', fontSize: 16},
    stage: {flex: 1, overflow: 'hidden'},
    canvas: {overflow: 'hidden'},
    loading: {...StyleSheet.absoluteFill},
    error: {...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000'},
    controls: {position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 24, backgroundColor: '#222222DD'},
    control: {minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12},
});
