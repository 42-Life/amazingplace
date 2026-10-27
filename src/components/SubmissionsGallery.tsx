// SUBMISSIONS GALLERY
// Full-screen popup showing a grid of every photo the user has submitted.
// Opened from the gallery button on the Capture screen.

// KEY IMPORTS
import {useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, Modal, Pressable, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
// expo-image, not React Native's Image: this grid loads full-size remote photos,
// and expo-image gives us disk caching and better memory behaviour for free
import {Image} from 'expo-image';
// Internal imports
import {theme} from '@/constants/theme';
import {galleryStyles} from '@/constants/styles';
import {fetchMySubmissions, type Submission} from '@/lib/photos';


// MAIN FUNCTION
export default function SubmissionsGallery({visible, onClose}: {visible: boolean, onClose: () => void}) {
    const {colors} = theme;
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string|null>(null);

    // LOAD PHOTOS EACH TIME THE GALLERY OPENS
    useEffect(() => {
        if (!visible) return;

        (async () => {
            // STEP 1: Show the spinner and clear any old error
            setIsLoading(true);
            setErrorMessage(null);
            try {
                // STEP 2: Fetch this user's submissions from Supabase
                setSubmissions(await fetchMySubmissions());
            } catch (err) {
                // STEP 3: If it fails, show a message instead of the grid
                console.error("Could not load submissions: ", err);
                setErrorMessage('Could not load your photos. Check your connection and try again.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [visible]);

    // RENDER
    return(
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={galleryStyles.safe}>

                {/* 1. Header: title and close button */}
                <View style={galleryStyles.header}>
                    <Text style={galleryStyles.title}>My Photos</Text>
                    <Pressable onPress={onClose} accessibilityLabel="Close gallery" hitSlop={12}>
                        <Ionicons name="close" size={28} color={colors.text} />
                    </Pressable>
                </View>

                {/* 2. Body: spinner, error, empty message, or the photo grid */}
                {isLoading ? (
                    <ActivityIndicator style={galleryStyles.centered} color={colors.active} />
                ) : errorMessage ? (
                    <Text style={[galleryStyles.centered, galleryStyles.message]}>{errorMessage}</Text>
                ) : submissions.length === 0 ? (
                    <Text style={[galleryStyles.centered, galleryStyles.message]}>No photos submitted yet. Take one and enter a challenge!</Text>
                ) : (
                    <FlatList
                        data={submissions}
                        keyExtractor={(item) => item.id}
                        numColumns={2}
                        contentContainerStyle={galleryStyles.grid}
                        columnWrapperStyle={galleryStyles.row}
                        renderItem={({item}) => (
                            // 3. Each tile: the photo plus the challenge it was entered into
                            <View style={galleryStyles.tile}>
                                <Image
                                    source={{uri: item.imageUrl}}
                                    style={galleryStyles.image}
                                    contentFit="cover"
                                    accessibilityLabel={`Photo submitted to ${item.challengeTitle}`}
                                />
                                <Text style={galleryStyles.caption} numberOfLines={2}>{item.challengeTitle}</Text>
                            </View>
                        )}
                    />
                )}
            </SafeAreaView>
        </Modal>
    )
}
