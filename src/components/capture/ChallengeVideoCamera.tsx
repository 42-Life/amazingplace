// CHALLENGE VIDEO CAMERA
// Record a video (up to 30 seconds, with sound), preview it, then submit it to ONE video challenge.
// Only opened from a video challenge's page, and the video can only go to that challenge.
// A video must start AND end inside the challenge's radius, so nobody can walk out of the area while filming.

// KEY IMPORTS
// Hooks
import {useCallback, useEffect, useRef, useState} from 'react';
// React and Expo functions and components
import {ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import {CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType} from 'expo-camera';
import {useVideoPlayer, VideoView} from 'expo-video';
import {useFocusEffect} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
// Internal imports
import {photoCaptureStyles as styles} from '@/constants/styles';
import type {ChallengeLocation, PhotoLocation} from '@/constants/types';
import {SubmissionError, uploadSubmission} from '@/lib/photos';
import {useLiveLocation} from '@/hooks/use-live-location';
import {formatDuration, getRecordedDurationMs, MAX_RECORDING_BYTES, MAX_VIDEO_DURATION_S} from '@/utils/media';
import SubmissionsGallery from '@/components/capture/SubmissionsGallery';
import RoundButton from '@/components/capture/ButtonRound';
import TextButton from '@/components/capture/ButtonWithText';


type ChallengeVideoCameraProps = {
    challenge: ChallengeLocation,   // the only challenge videos recorded here can be submitted to
    onClose: () => void,            // closes the camera and returns to the challenge page
}

// A finished recording, waiting to be previewed and submitted
type Recording = {
    uri: string
    durationMs: number
    startLocation: PhotoLocation | null     // where recording started (null = unknown)
    endLocation: PhotoLocation | null       // where recording stopped (null = unknown)
}


// MAIN FUNCTION
export default function ChallengeVideoCamera({challenge, onClose}: ChallengeVideoCameraProps) {
    const insets = useSafeAreaInsets();

    // Hook variables
    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [micPermission, requestMicPermission] = useMicrophonePermissions();

    // Camera config
    const [facing, setFacing] = useState<CameraType>('back');
    const [isCameraReady, setIsCameraReady] = useState(false);     // recording can only start once the camera says it's ready

    // Recording state
    const [isRecording, setIsRecording] = useState(false);         // true from pressing record until the video file is saved
    const [elapsedS, setElapsedS] = useState(0);                   // seconds recorded so far, shown in the timer
    const lastProgressS = useRef(0);                               // the recorder's latest progress report, used for the video's length
    const [recording, setRecording] = useState<Recording | null>(null);

    // Where the user is right now (tracked while the camera is open, see src/hooks/use-live-location.ts)
    const getCurrentLocation = useLiveLocation();

    // Submission state
    const [isUploading, setIsUploading] = useState(false);         // true while a video is uploading; blocks double submits
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);     // true while the "My submissions" gallery is showing

    // Turn the camera off while another screen covers this one
    //   (unmounting the camera also stops any recording in progress)
    const [isFocused, setIsFocused] = useState(true);
    useFocusEffect(
        useCallback(() => {
            setIsFocused(true);
            return () => {
                setIsFocused(false);
                setIsCameraReady(false);
            };
        }, [])
    );

    // Videos have sound, so ask for the microphone the first time, even if the camera was allowed earlier
    //   (e.g. from a photo challenge). If the user says no, videos are recorded without sound instead.
    useEffect(() => {
        if (permission?.granted && micPermission && micPermission.status === 'undetermined') {
            requestMicPermission();
        }
    }, [permission?.granted, micPermission, requestMicPermission]);
    const hasSound = micPermission?.granted ?? false;

    // KEY HANDLER: START RECORDING
    //   Resolves only when recording stops: the stop button, the 30 s limit, the size limit,
    //   or the camera turning off (e.g. the app goes to the background)
    const startRecording = async () => {
        if (!cameraRef.current || !isCameraReady || isRecording) return;
        setIsRecording(true);
        setElapsedS(0);
        lastProgressS.current = 0;
        const startedAt = Date.now();

        try {
            // Note where recording starts, without delaying the start
            const startLocationPromise = getCurrentLocation();
            const video = await cameraRef.current.recordAsync({
                maxDuration: MAX_VIDEO_DURATION_S,
                maxFileSize: MAX_RECORDING_BYTES,
            });
            const elapsedMs = Date.now() - startedAt;
            const [startLocation, endLocation] = await Promise.all([startLocationPromise, getCurrentLocation()]);

            if (video?.uri) {
                setRecording({
                    uri: video.uri,
                    durationMs: getRecordedDurationMs(lastProgressS.current, elapsedMs),
                    startLocation,
                    endLocation,
                });
            }
        } catch (err) {
            console.error("Could not record video: ", err);
            Alert.alert('Recording failed', 'Something went wrong while recording. Please try again.');
        } finally {
            setIsRecording(false);
        }
    }

    // KEY HANDLER: STOP RECORDING (startRecording then finishes with the saved video)
    const stopRecording = () => cameraRef.current?.stopRecording();

    // SIMPLE HANDLER FUNCTIONS
    // Flipping is hidden while recording, because flipping stops the recording
    const flipCamera = () => setFacing((current) => (current === 'back' ? 'front' : 'back'));
    const discardRecording = () => setRecording(null);

    // KEY HANDLER: SUBMIT TO THIS CHALLENGE
    // Uploads the video and enters it into the challenge this camera was opened from
    const handleSubmit = async () => {
        // STEP 1: Make sure there's a video and we're not already uploading
        if (!recording || isUploading) return;

        // STEP 2: Show the uploading spinner
        setIsUploading(true);

        try {
            // STEP 3: Upload the video and record the submission (see src/lib/photos.ts)
            //   Also checks it started and ended inside the challenge's radius
            await uploadSubmission(
                {mediaType: 'video', uri: recording.uri, durationMs: recording.durationMs, endLocation: recording.endLocation},
                challenge,
                recording.startLocation,
            );

            // STEP 4: Confirm success and go back to the camera
            Alert.alert('Video submitted!', `Your video was entered into "${challenge.title}".`);
            setRecording(null);
        } catch (err) {
            // STEP 5: On failure, keep the video on screen so the user can try again
            //   Location, length and size problems have messages written for users
            if (err instanceof SubmissionError) {
                Alert.alert("Can't enter this video", err.message);
            } else {
                console.error("Video upload failed: ", err);
                Alert.alert('Upload failed', 'Something went wrong. Please try again.');
            }
        } finally {
            setIsUploading(false);
        }
    }


    // PERMISSION CHECKS
    // No permission value yet: fill while checking, so nothing flashes on screen
    if (!permission || !micPermission) return <View style={styles.fill}/>

    // Camera not allowed: ask for it (and the microphone, so videos have sound)
    if (!permission.granted) {
        const askForAccess = async () => {
            const camera = await requestPermission();
            if (camera.granted && micPermission.status === 'undetermined') await requestMicPermission();
        };
        return(
            <View style={[styles.fill, styles.center]}>
                <RoundButton icon="close" label="Close camera" corner="left" onPress={onClose} />
                <Text style={styles.message}>AmazingPlace needs camera access, and microphone access for sound, so you can record videos for challenges</Text>
                <TextButton
                    label={permission.canAskAgain ? 'Allow camera' : 'Open settings'}
                    onPress={permission.canAskAgain ? askForAccess : Linking.openSettings}
                />
            </View>
        )
    }

    // VIDEO PREVIEW: VIDEO RECORDED
    if (recording) {
        return(
            <View style={styles.fill}>
                {/* 1. The video itself, playing on a loop */}
                <RecordingPreview uri={recording.uri} />

                {/* Discard button, and the video's length */}
                {!isUploading && (
                    <RoundButton icon="close" label="Discard video" corner="left" onPress={discardRecording} />
                )}
                <View style={[styles.timer, {top: insets.top + 22}]}>
                    <Text style={styles.timerText}>{formatDuration(recording.durationMs / 1000)}</Text>
                </View>

                {/* 2. Retake / Submit buttons. Submit always goes to this challenge. */}
                <View style={styles.previewButtons}>
                    <TextButton label="Retake Video" variant="secondary" onPress={discardRecording} disabled={isUploading} />
                    <TextButton label="Submit Video" onPress={handleSubmit} disabled={isUploading} />
                </View>

                {/* 3. Spinner shown on top of everything while uploading */}
                {isUploading && (
                    <View style={styles.uploadingOverlay}>
                        <ActivityIndicator size="large" color="#FFFFFF" />
                        <Text style={styles.message}>Uploading video...</Text>
                    </View>
                )}
            </View>
        )
    }

    // LIVE CAMERA
    return(
        <View style={styles.fill}>
            {isFocused && (
                <CameraView
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    facing={facing}
                    mode="video"
                    videoQuality="720p"     // keeps a 30 s video around 30 MB or less
                    mute={!hasSound}
                    onCameraReady={() => setIsCameraReady(true)}
                    onRecordingProgress={({duration}) => {
                        lastProgressS.current = duration;
                        setElapsedS(duration);
                    }}
                />
            )}

            {/* Close, gallery and flip are hidden while recording, so a tap can't lose the video */}
            {!isRecording && (
                <>
                    <RoundButton icon="close" label="Close camera" corner="left" onPress={onClose} />
                    <RoundButton icon="camera-reverse-outline" label="Flip camera" corner="right" onPress={flipCamera} />
                </>
            )}

            {/* TIMER: time recorded out of the 30 s limit */}
            <View style={[styles.timer, isRecording && styles.timerRecording, {top: insets.top + 22}]} accessibilityLiveRegion="polite">
                <Text style={styles.timerText}>
                    {formatDuration(isRecording ? elapsedS : 0)} / {formatDuration(MAX_VIDEO_DURATION_S)}
                </Text>
            </View>

            {!hasSound && !isRecording && (
                <Text style={styles.notice}>Recording without sound. Allow microphone access in Settings to add sound.</Text>
            )}

            <View style={styles.controls}>
                {/* OPEN GALLERY BUTTON (an empty space while recording, so the record button stays centred) */}
                {isRecording
                    ? <View style={{width: 52, height: 52}} />
                    : <RoundButton icon="images-outline" label="View gallery" onPress={() => setIsGalleryOpen(true)} />}

                {/* RECORD / STOP BUTTON */}
                <Pressable
                    style={[styles.shutterRing, !isCameraReady && {opacity: 0.5}]}
                    onPress={isRecording ? stopRecording : startRecording}
                    disabled={!isCameraReady}
                    accessibilityRole="button"
                    accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
                >
                    <View style={isRecording ? styles.recordStop : styles.recordDot} />
                </Pressable>

                {/* Empty space the size of a round button, so the record button stays centred */}
                <View style={{width: 52, height: 52}} />
            </View>

            {/* GALLERY POPUP (hidden until the gallery button is pressed) */}
            <SubmissionsGallery visible={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} />
        </View>
    )
}


// RECORDING PREVIEW
// Plays the just-recorded video on a loop, filling the screen like the photo preview does.
// Its own component so the player is created for this video and released when the preview closes.
function RecordingPreview({uri}: {uri: string}) {
    const player = useVideoPlayer(uri, (newPlayer) => {
        newPlayer.loop = true;
        newPlayer.play();
    });
    return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}
