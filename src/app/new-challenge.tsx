// NEW CHALLENGE SCREEN
// The create-challenge form, opened from the Capture tab's "+ New Challenge" button.
// The photo the user just took comes along in the route params and is entered
// into the challenge as its first submission once the challenge is saved.

// KEY IMPORTS
import {router, useLocalSearchParams} from 'expo-router';
import CreateChallengeForm from '@/components/CreateChallengeForm';


// MAIN FUNCTION
export default function NewChallengeScreen() {
    const {photoUri, photoMimeType} = useLocalSearchParams<{photoUri: string, photoMimeType: string}>();

    return (
        <CreateChallengeForm
            photoUri={photoUri}
            photoMimeType={photoMimeType}
            onCreated={() => router.back()}   // straight back to the camera once it's saved
        />
    );
}
