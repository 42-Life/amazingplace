// MANAGE SCREEN
import {View} from 'react-native';
import ChallengeDashboard from '@/components/ChallengeDashboard';
import {challengeListStyles as styles} from '@/constants/styles';

export default function ManageScreen() {
    return (
        <View style={styles.fill}>
            <ChallengeDashboard />
        </View>
    );
}
