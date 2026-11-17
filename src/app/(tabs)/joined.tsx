import {View} from 'react-native';
import ParticipatingChallenges from '@/components/ParticipatingChallenges';
import {challengeListStyles as styles} from '@/constants/styles';

export default function JoinedScreen() {
    return (
        <View style={styles.fill}>
            <ParticipatingChallenges />
        </View>
    );
}
