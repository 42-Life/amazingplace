// SUBMISSION VIDEO
// Player for one video submission, with the phone's own playback controls.
// The video counterpart of ZoomableImage: sits at the top of the submission page.

import {useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {useEvent} from 'expo';
import {useVideoPlayer, VideoView} from 'expo-video';
import {theme} from '@/constants/theme';

export default function SubmissionVideo({videoUrl, width, height}: {videoUrl: string; width: number; height: number}) {
    // Changing the key makes a fresh player, which is how "Try again" reloads the video
    const [attempt, setAttempt] = useState(0);
    return <Player key={attempt} videoUrl={videoUrl} width={width} height={height} onRetry={() => setAttempt((value) => value + 1)} />;
}

// The player itself. Starts playing as soon as it opens, once through (the controls can replay it).
function Player({videoUrl, width, height, onRetry}: {videoUrl: string; width: number; height: number; onRetry: () => void}) {
    const player = useVideoPlayer(videoUrl, (newPlayer) => newPlayer.play());
    const {status} = useEvent(player, 'statusChange', {status: player.status});

    return (
        <View style={[styles.stage, {width, height}]}>
            <VideoView player={player} style={styles.fill} contentFit="contain" nativeControls />
            {(status === 'idle' || status === 'loading') && (
                <ActivityIndicator style={styles.overlay} color={theme.colors.active} accessibilityLabel="Loading video" />
            )}
            {status === 'error' && (
                <View style={[styles.overlay, styles.error]}>
                    <Text style={styles.message}>Could not load this video.</Text>
                    <Pressable accessibilityRole="button" style={styles.retry} onPress={onRetry}>
                        <Text style={styles.link}>Try again</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    fill: {flex: 1},
    stage: {backgroundColor: '#FFFFFF'},
    overlay: {...StyleSheet.absoluteFill},
    error: {alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#FFFFFF'},
    message: {color: theme.colors.inactive, fontSize: 15},
    retry: {minHeight: 44, justifyContent: 'center', paddingHorizontal: 16},
    link: {color: theme.colors.active, fontSize: 16, fontWeight: '600'},
});
