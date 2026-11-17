// VIDEO VIEWER
// Full-screen player for one video submission, with the phone's own playback controls.
// The video counterpart of ImageViewer: opened by tapping a video in a submission grid.

import {useState} from 'react';
import {ActivityIndicator, Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {useEvent} from 'expo';
import {useVideoPlayer, VideoView} from 'expo-video';

export default function VideoViewer({videoUrl, onClose}: {videoUrl: string; onClose: () => void}) {
    // Changing the key makes a fresh player, which is how "Try again" reloads the video
    const [attempt, setAttempt] = useState(0);

    return (
        <Modal visible animationType="fade" presentationStyle="fullScreen" supportedOrientations={['portrait', 'landscape']} onRequestClose={onClose}>
            <SafeAreaProvider>
                <SafeAreaView style={styles.safe}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Video</Text>
                        <Pressable accessibilityRole="button" accessibilityLabel="Close video" onPress={onClose} style={styles.control}>
                            <Ionicons name="close" size={28} color="#FFFFFF" />
                        </Pressable>
                    </View>
                    <Player key={attempt} videoUrl={videoUrl} onRetry={() => setAttempt((value) => value + 1)} />
                </SafeAreaView>
            </SafeAreaProvider>
        </Modal>
    );
}

// The player itself. Starts playing as soon as it opens, once through (the controls can replay it).
function Player({videoUrl, onRetry}: {videoUrl: string; onRetry: () => void}) {
    const player = useVideoPlayer(videoUrl, (newPlayer) => newPlayer.play());
    const {status} = useEvent(player, 'statusChange', {status: player.status});

    return (
        <View style={styles.stage}>
            <VideoView player={player} style={styles.fill} contentFit="contain" nativeControls />
            {(status === 'idle' || status === 'loading') && (
                <ActivityIndicator style={styles.overlay} color="#FFFFFF" accessibilityLabel="Loading video" />
            )}
            {status === 'error' && (
                <View style={[styles.overlay, styles.error]}>
                    <Text style={styles.white}>Could not load this video.</Text>
                    <Pressable accessibilityRole="button" style={styles.control} onPress={onRetry}>
                        <Text style={styles.white}>Try again</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    fill: {flex: 1},
    safe: {flex: 1, backgroundColor: '#000000'},
    header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16},
    title: {color: '#FFFFFF', fontSize: 18, fontWeight: '600'},
    white: {color: '#FFFFFF', fontSize: 16},
    stage: {flex: 1},
    overlay: {...StyleSheet.absoluteFill},
    error: {alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000'},
    control: {minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12},
});
