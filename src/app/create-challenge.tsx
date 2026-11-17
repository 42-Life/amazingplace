import {router} from 'expo-router';
import CreateChallengeForm from '@/components/CreateChallengeForm';

export default function CreateChallengeScreen() {
    return <CreateChallengeForm onCreated={() => router.back()} onCancel={() => router.back()} />;
}
