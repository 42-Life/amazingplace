// CAPTURE SCREEN
// Take a photo (or pick one from the phone), preview it, then submit it to a challenge.

// KEY IMPORTS
// Hooks
import {useCallback, useRef, useState} from 'react';
// React and Expo functions and components
import {ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {CameraView, useCameraPermissions, type CameraType} from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {useFocusEffect} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
// Internal imports
import {theme} from '@/constants/theme';
import {photoCaptureStyles} from '@/constants/styles'
import type {ChallengeLocation} from '@/constants/types';
import {fetchChallenges} from '@/lib/challenges';
import {uploadPhotoToChallenge} from '@/lib/photos';
import SubmissionsGallery from '@/components/SubmissionsGallery';


// MAIN FUNCTION
export default function CaptureScreen() {
    // Key constants
    const {colors} = theme;
    const insets = useSafeAreaInsets();

    // Hook variables
    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();

    // Camera config
    const [facing, setFacing] = useState<CameraType>('back');       // initial set up is back camera activated. I imagine most cases would be this. Some challenges could prompt selfies with a location though. Privacy convern?
    const [photoUri, setPhotoUri] = useState<string|null>(null);
    const [photoMimeType, setPhotoMimeType] = useState('image/jpeg'); // file type of the current photo (camera photos are always JPEG)
    const [isCapturing, setIsCapturing] = useState(false);          // state determines whether user is taking a photo & blocks double tap based on that

    // Submission state
    const [challenges, setChallenges] = useState<ChallengeLocation[]>([]);   // challenges loaded from Supabase
    const [isChoosingChallenge, setIsChoosingChallenge] = useState(false);   // true while the "which challenge?" sheet is open
    const [isLoadingChallenges, setIsLoadingChallenges] = useState(false);
    const [isUploading, setIsUploading] = useState(false);                   // true while a photo is uploading; blocks double submits
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);               // true while the "My Photos" gallery is showing

    // Determine when to turn off and on camera
    const [isFocused, setIsFocused] = useState(true);               // true when on this page.
    useFocusEffect(
        useCallback(() => {
            setIsFocused(true);                         // true when tab is visible
            return () => {setIsFocused(false);};  // false when away from this tab
        }, [])
    );

    // KEY HANDLER: PHOTO CAPTURE
    const takePhoto = async () => {
        if (isCapturing) return;        // break here if photo is being captured already; can't take photo in that case
        setIsCapturing(true);           // shows that we are NOW taking a photo. Blocks calling this function again
        try {
            const photo = await cameraRef.current?.takePictureAsync({quality: 0.7});   // 0.7 keeps photos sharp but much smaller, so uploads are faster
            if (photo) {
                setPhotoUri(photo.uri);         // if we received from the async fn, then we set the URI of the photo we just captured
                setPhotoMimeType('image/jpeg');
            }
        } catch (err) {
            console.error("Could not capture photo due to error: ", err);
        } finally {
            setIsCapturing(false);      // no longer capturing a photo, regardless of outcome of attempt to take photo
        }
    }

    // SIMPLE HANDLER FUNCTIONS
    const flipCamera = () => {setFacing((current) => (current === 'back' ? 'front' : 'back'))}

    // Clears the current photo and closes any open sheet, returning to the live camera
    const resetPhoto = () => {
        setPhotoUri(null);
        setIsChoosingChallenge(false);
    }

    // Opens the gallery of photos this user has submitted (see src/components/SubmissionsGallery.tsx)
    const handleViewGallery = () => setIsGalleryOpen(true);

    // KEY HANDLER: UPLOAD FROM PHONE
    // Lets the user pick an existing photo instead of taking a new one
    const handleUploadFromPhone = async () => {
        // STEP 1: Open the phone's photo library (images only; no permission prompt needed)
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
        });

        // STEP 2: Stop if the user closed the library without choosing anything
        if (result.canceled) return;

        // STEP 3: Show the chosen photo in the same preview screen used for camera photos
        const asset = result.assets[0];
        setPhotoUri(asset.uri);
        setPhotoMimeType(asset.mimeType ?? 'image/jpeg');
    }

    // KEY HANDLER: USE PHOTO
    // Opens the sheet that asks which challenge to submit the photo to
    const handleUsePhoto = async () => {
        // STEP 1: Open the sheet right away so the button feels responsive
        setIsChoosingChallenge(true);

        // STEP 2: Load the challenge list from Supabase (only the first time)
        if (challenges.length > 0) return;
        setIsLoadingChallenges(true);
        try {
            setChallenges(await fetchChallenges());
        } catch (err) {
            console.error("Could not load challenges: ", err);
            Alert.alert('Could not load challenges', 'Check your connection and try again.');
            setIsChoosingChallenge(false);
        } finally {
            setIsLoadingChallenges(false);
        }
    }

    // KEY HANDLER: SUBMIT TO CHALLENGE
    // Uploads the photo and enters it into the chosen challenge
    const handleSubmitToChallenge = async (challenge: ChallengeLocation) => {
        // STEP 1: Make sure there's a photo and we're not already uploading
        if (!photoUri || isUploading) return;

        // STEP 2: Close the sheet and show the uploading spinner
        setIsChoosingChallenge(false);
        setIsUploading(true);

        try {
            // STEP 3: Upload the photo and record the submission (see src/lib/photos.ts)
            await uploadPhotoToChallenge(photoUri, challenge.id, photoMimeType);

            // STEP 4: Confirm success and go back to the camera
            Alert.alert('Photo submitted!', `Your photo was entered into "${challenge.title}".`);
            resetPhoto();
        } catch (err) {
            // STEP 5: On failure, keep the photo on screen so the user can try again
            console.error("Upload failed: ", err);
            Alert.alert('Upload failed', 'Something went wrong. Please try again.');
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
                <Text style={photoCaptureStyles.message}>AmazingPlace requires camera access, so you can capture photos for challenges</Text>
                <Pressable
                    style={[photoCaptureStyles.textButton, {backgroundColor: colors.active}]}
                    onPress={permission.canAskAgain ? requestPermission : Linking.openSettings}     // asks for permission via OS procedure
                >
                    <Text style={photoCaptureStyles.textButtonLabel}>
                        {permission.canAskAgain ? 'Allow camera' : 'Open Settings'}
                    </Text>
                </Pressable>
            </View>
        )
    }

    // PHOTO PREVIEW: PHOTO TAKEN OR CHOSEN
    if (photoUri) {
        return(
            <View style={photoCaptureStyles.fill}>
                {/* 1. The photo itself, filling the screen */}
                <Image source={{uri: photoUri}} style={StyleSheet.absoluteFill} resizeMode="cover" />

                {/* 2. Retake / Use Photo buttons (hidden while the sheet is open) */}
                {!isChoosingChallenge && (
                    <View style={photoCaptureStyles.previewButtons}>
                        <Pressable style={[photoCaptureStyles.textButton, photoCaptureStyles.secondary]} onPress={resetPhoto} disabled={isUploading}>
                            <Text style={photoCaptureStyles.textButtonLabel}>Retake Photo</Text>
                        </Pressable>

                        <Pressable style={[photoCaptureStyles.textButton, {backgroundColor: colors.active}]} onPress={handleUsePhoto} disabled={isUploading}>
                            <Text style={photoCaptureStyles.textButtonLabel}>Use Photo</Text>
                        </Pressable>
                    </View>
                )}

                {/* 3. "Which challenge?" sheet: tap a challenge to submit the photo to it */}
                {isChoosingChallenge && (
                    <View style={photoCaptureStyles.chooserSheet}>
                        <Text style={photoCaptureStyles.chooserTitle}>Submit to which challenge?</Text>

                        {isLoadingChallenges ? (
                            <ActivityIndicator color={colors.active} />
                        ) : challenges.length === 0 ? (
                            <Text style={photoCaptureStyles.chooserMessage}>No challenges yet.</Text>
                        ) : (
                            <ScrollView>
                                {challenges.map((challenge) => (
                                    <Pressable
                                        key={challenge.id}
                                        style={photoCaptureStyles.chooserItem}
                                        onPress={() => handleSubmitToChallenge(challenge)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Submit photo to ${challenge.title}`}
                                    >
                                        <Text style={photoCaptureStyles.chooserItemTitle}>{challenge.title}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        )}

                        <Pressable style={photoCaptureStyles.chooserCancel} onPress={() => setIsChoosingChallenge(false)}>
                            <Text style={photoCaptureStyles.chooserCancelText}>Cancel</Text>
                        </Pressable>
                    </View>
                )}

                {/* 4. Spinner shown on top of everything while uploading */}
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

            <Pressable
                style={[photoCaptureStyles.roundButton, {position: 'absolute', top: insets.top + 12, right: 16}]}
                onPress={flipCamera}
                accessibilityLabel="Flip camera"
            >
                <Ionicons name="camera-reverse-outline" size={26} color="#FFFFFF" />
            </Pressable>

            <View style={photoCaptureStyles.controls}>

                {/* OPEN PHOTO GALLERY BUTTON*/}
                <Pressable
                    style={photoCaptureStyles.roundButton}
                    onPress={handleViewGallery}
                    accessibilityLabel="View gallery"
                >
                    <Ionicons name="images-outline" size={26} color="#FFFFFF" />
                </Pressable>

                {/* CAPTURE PHOTO BUTTON*/}
                <Pressable
                    style={[photoCaptureStyles.shutterRing, isCapturing && {opacity: 0.5}]}
                    onPress={takePhoto}
                    accessibilityLabel="Take photo"
                >
                    <View style={photoCaptureStyles.shutterCenter} />
                </Pressable>

                {/* UPLOAD BUTTON*/}
                <Pressable
                    style={photoCaptureStyles.roundButton}
                    onPress={handleUploadFromPhone}
                    accessibilityLabel="Upload from gallery"
                >
                    <Ionicons name="cloud-upload-outline" size={26} color="#FFFFFF" />
                </Pressable>
            </View>

            {/* GALLERY POPUP (hidden until the gallery button is pressed) */}
            <SubmissionsGallery visible={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} />
        </View>
    )
}
