// // TEMPORARY IMPLEMENTATION: Will fill with meaningful content & styling once skeleton UI is established
// import ScreenShell from '@/components/ScreenShell';
//
// export default function CaptureScreen() {
//     // return <ScreenShell title="Capture" />;
// }

// KEY IMPORTS
// Hooks
import {useCallback, useRef, useState} from 'react';
// React and Expo functions and components
import {Image, Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import {CameraView, useCameraPermissions, type CameraType} from 'expo-camera';
import {useFocusEffect} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
// Internal imports
import {theme} from '@/constants/theme';
import {photoCaptureStyles} from '@/constants/styles'


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
    const [isCapturing, setIsCapturing] = useState(false);          // state determines whether user is taking a photo & blocks double tap based on that

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
            const photo = await cameraRef.current?.takePictureAsync();
            if (photo) setPhotoUri(photo.uri);      // if we received from the async fn, then we set the URI of the photo we just captured
        } catch (err) {
            console.error("Could not capture photo due to error: ", err);
        } finally {
            setIsCapturing(false);      // no longer capturing a photo, regardless of outcome of attempt to take photo
        }
    }

    // SIMPLE HANDLER FUNCTIONS
    const flipCamera = () => {setFacing((current) => (current === 'back' ? 'front' : 'back'))}

    // PLACEHOLDER HANDLERS - TODO EXTEND FUNCTIONALITY; requires DB connection
    // HVG: for displaying photos the user has captured in-app
    const handleViewGallery = () => console.log('TODO: show gallery of uploaded images');
    // HUFP: For handling photo upload. Should run a CREATE action on photo database
    const handleUploadFromPhone = () => console.log('TODO: pick an image from the phone gallery');
    // HUP: Should connect to challenges; allows user to enter a captured photo directly into a challenge from a set of challenges
    const handleUsePhoto = () => console.log('TODO: choose a challenge for', photoUri);


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

    // PHOTO PREVIEW: PHOTO TAKEN
    if (photoUri) {
        return(
            <View style={photoCaptureStyles.fill}>
                <Image source={{uri: photoUri}} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <View style={photoCaptureStyles.previewButtons}>

                    <Pressable style={[photoCaptureStyles.textButton, photoCaptureStyles.secondary]} onPress={() => setPhotoUri(null)}>
                        <Text style={photoCaptureStyles.textButtonLabel}>Retake Photo</Text>
                    </Pressable>

                    <Pressable style={[photoCaptureStyles.textButton, {backgroundColor: colors.active}]} onPress={handleUsePhoto}>
                        <Text style={photoCaptureStyles.textButtonLabel}>Use Photo</Text>
                    </Pressable>
                </View>
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
        </View>
    )


}