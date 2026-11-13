// CHALLENGE CAMERA
// Take a photo, preview it, then submit it to ONE challenge.
// Only opened from a challenge's page, and the photo can only go to that challenge.
// Each photo keeps the spot it was taken at, and is only accepted inside the challenge's radius.

// KEY IMPORTS
// Hooks
import {useCallback, useEffect, useRef, useState} from 'react';
// React and Expo functions and components
import {ActivityIndicator, Alert, Image, Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import {CameraView, useCameraPermissions, type CameraType} from 'expo-camera';
import * as Location from 'expo-location';
import {LocationAccuracy} from 'expo-location';
import {useFocusEffect} from 'expo-router';
// Internal imports
import {photoCaptureStyles} from '@/constants/styles'
import type {ChallengeLocation, PhotoLocation} from '@/constants/types';
import {PhotoLocationError, uploadPhotoToChallenge} from '@/lib/photos';
import SubmissionsGallery from '@/components/capture/SubmissionsGallery';
import RoundButton from '@/components/capture/ButtonRound';
import TextButton from '@/components/capture/ButtonWithText';


type ChallengeCameraProps = {
    challenge: ChallengeLocation,   // the only challenge photos taken here can be submitted to
    onClose: () => void,            // closes the camera and returns to the challenge page
}

// MAIN FUNCTION
export default function ChallengeCamera({challenge, onClose}: ChallengeCameraProps) {
    // Hook variables
    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();

    // Camera config
    const [facing, setFacing] = useState<CameraType>('back');       // initial set up is back camera activated. I imagine most cases would be this. Some challenges could prompt selfies with a location though. Privacy convern?
    const [photoUri, setPhotoUri] = useState<string|null>(null);
    const [isCapturing, setIsCapturing] = useState(false);          // state determines whether user is taking a photo & blocks double tap based on that
    const [photoLocation, setPhotoLocation] = useState<PhotoLocation | null>(null);   // where the current photo was taken (null = unknown)

    // Latest GPS reading while the camera is open, so a photo gets its location instantly
    const latestLocation = useRef<PhotoLocation | null>(null);

    // Submission state
    const [isUploading, setIsUploading] = useState(false);                   // true while a photo is uploading; blocks double submits
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);               // true while the "My Photos" gallery is showing

    // Determine when to turn off and on camera
    const [isFocused, setIsFocused] = useState(true);               // true when the challenge screen is visible
    useFocusEffect(
        useCallback(() => {
            setIsFocused(true);                         // true when screen is visible
            return () => {setIsFocused(false);};  // false when another screen covers it
        }, [])
    );

    // TRACK LOCATION WHILE THE CAMERA IS OPEN
    useEffect(() => {
        let isMounted = true;
        let subscription: Location.LocationSubscription | null = null;

        (async () => {
            try {
                // STEP 1: Ask for location permission (no prompt if already granted)
                const {status} = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted' || !isMounted) return;

                // STEP 2: Keep the latest reading. High = about 10 m accuracy
                const sub = await Location.watchPositionAsync(
                    {accuracy: LocationAccuracy.High, distanceInterval: 5},
                    (position) => {
                        latestLocation.current = {latitude: position.coords.latitude, longitude: position.coords.longitude};
                    }
                );
                if (isMounted) subscription = sub;
                else sub.remove();      // camera closed while we were starting up
            } catch (err) {
                console.error("Could not track location for photos: ", err);
            }
        })();

        // STEP 3: Stop tracking when the camera closes
        return () => {
            isMounted = false;
            subscription?.remove();
        };
    }, []);

    // Where the user is right now: the latest tracked reading, or a fresh one if none has arrived yet
    const getCurrentLocation = async (): Promise<PhotoLocation | null> => {
        if (latestLocation.current) return latestLocation.current;
        try {
            const {status} = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') return null;
            const position = await Location.getCurrentPositionAsync({accuracy: LocationAccuracy.High});
            return {latitude: position.coords.latitude, longitude: position.coords.longitude};
        } catch (err) {
            console.error("Could not get location for photo: ", err);
            return null;
        }
    }

    // KEY HANDLER: PHOTO CAPTURE
    const takePhoto = async () => {
        if (isCapturing) return;        // break here if photo is being captured already; can't take photo in that case
        setIsCapturing(true);           // shows that we are NOW taking a photo. Blocks calling this function again
        try {
            // Take the photo and record where we are at the same moment
            const [photo, location] = await Promise.all([
                cameraRef.current?.takePictureAsync({quality: 0.7}),   // 0.7 keeps photos sharp but much smaller, so uploads are faster
                getCurrentLocation(),
            ]);
            if (photo) {
                setPhotoUri(photo.uri);         // if we received from the async fn, then we set the URI of the photo we just captured
                setPhotoLocation(location);
            }
        } catch (err) {
            console.error("Could not capture photo due to error: ", err);
        } finally {
            setIsCapturing(false);      // no longer capturing a photo, regardless of outcome of attempt to take photo
        }
    }

    // SIMPLE HANDLER FUNCTIONS
    const flipCamera = () => {setFacing((current) => (current === 'back' ? 'front' : 'back'))}

    // Clears the current photo, returning to the live camera
    const resetPhoto = () => {
        setPhotoUri(null);
        setPhotoLocation(null);
    }

    // Opens the gallery of photos this user has submitted (see src/components/capture/SubmissionsGallery.tsx)
    const handleViewGallery = () => setIsGalleryOpen(true);

    // KEY HANDLER: SUBMIT TO THIS CHALLENGE
    // Uploads the photo and enters it into the challenge this camera was opened from
    const handleSubmit = async () => {
        // STEP 1: Make sure there's a photo and we're not already uploading
        if (!photoUri || isUploading) return;

        // STEP 2: Show the uploading spinner
        setIsUploading(true);

        try {
            // STEP 3: Upload the photo and record the submission (see src/lib/photos.ts)
            //   Also checks the photo was taken inside the challenge's radius
            await uploadPhotoToChallenge(photoUri, challenge, photoLocation);

            // STEP 4: Confirm success and go back to the camera
            Alert.alert('Photo submitted!', `Your photo was entered into "${challenge.title}".`);
            resetPhoto();
        } catch (err) {
            // STEP 5: On failure, keep the photo on screen so the user can try again
            if (err instanceof PhotoLocationError) {
                Alert.alert("Can't enter this photo", err.message);
            } else {
                console.error("Upload failed: ", err);
                Alert.alert('Upload failed', 'Something went wrong. Please try again.');
            }
        } finally {
            setIsUploading(false);
        }
    }


    // PERMISSION CHECKS
    // No permission value yet
    if (!permission) return <View style={photoCaptureStyles.fill}/>        // fill while checking the permission; hides content temporarily until permission state is confirmed

    // Permission value received; not authorised -- Prompts user for permission
    if (!permission.granted) {
        return(
            <View style={[photoCaptureStyles.fill, photoCaptureStyles.center]}>
                <RoundButton icon="close" label="Close camera" corner="left" onPress={onClose} />
                <Text style={photoCaptureStyles.message}>AmazingPlace requires camera access, so you can capture photos for challenges</Text>

                <TextButton
                    label={permission.canAskAgain ? 'Allow camera' : 'Open settings'}
                    onPress={permission.canAskAgain ? requestPermission : Linking.openSettings}
                />
            </View>
        )
    }

    // PHOTO PREVIEW: PHOTO TAKEN OR CHOSEN
    if (photoUri) {
        return(
            <View style={photoCaptureStyles.fill}>
                {/* 1. The photo itself, filling the screen */}
                <Image source={{uri: photoUri}} style={StyleSheet.absoluteFill} resizeMode="cover" />

                {/* Display discard button when showing preview of taken photo */}
                {!isUploading && (
                    <RoundButton icon={"close"} label={"Discard photo"} corner={"left"} onPress={resetPhoto} />
                )}

                {/* 2. Retake / Submit buttons. Submit always goes to this challenge. */}
                <View style={photoCaptureStyles.previewButtons}>
                    <TextButton label={"Retake Photo"} variant={"secondary"} onPress={resetPhoto} disabled={isUploading} />
                    <TextButton label={"Submit Photo"} onPress={handleSubmit} disabled={isUploading} />
                </View>

                {/* 3. Spinner shown on top of everything while uploading */}
                {isUploading && (
                    <View style={photoCaptureStyles.uploadingOverlay}>
                        <ActivityIndicator size="large" color="#FFFFFF" />
                        <Text style={photoCaptureStyles.message}>Uploading photo...</Text>
                    </View>
                )}
            </View>
        )
    }

    // LIVE CAMERA CAPTURE
    return(
        <View style={photoCaptureStyles.fill}>
            {isFocused && (
                <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />
            )}

            <RoundButton icon="close" label="Close camera" corner="left" onPress={onClose} />
            {/*FLIP CAMERA BUTTON: toggles between front/back camera*/}
            <RoundButton icon="camera-reverse-outline" label="Flip camera" corner="right" onPress={flipCamera} />

            <View style={photoCaptureStyles.controls}>

                {/* OPEN PHOTO GALLERY BUTTON*/}
                <RoundButton icon="images-outline" label="View gallery" onPress={handleViewGallery} />

                {/* CAPTURE PHOTO BUTTON*/}
                <Pressable
                    style={[photoCaptureStyles.shutterRing, isCapturing && {opacity: 0.5}]}
                    onPress={takePhoto}
                    accessibilityLabel="Take photo"
                >
                    <View style={photoCaptureStyles.shutterCenter} />
                </Pressable>

                {/* Empty space the size of a round button, so the shutter stays centred */}
                <View style={{width: 52, height: 52}} />
            </View>

            {/* GALLERY POPUP (hidden until the gallery button is pressed) */}
            <SubmissionsGallery visible={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} />
        </View>
    )
}
