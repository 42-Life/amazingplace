// CHALLENGES SCREEN
// Switch between participating in challenges and managing them.
import {useState} from 'react';
import {Keyboard, Pressable, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import ChallengeDashboard from '@/components/ChallengeDashboard';
import ParticipatingChallenges from '@/components/ParticipatingChallenges';
import {challengeListStyles as styles} from '@/constants/styles';
import {theme} from '@/constants/theme';

export default function ChallengesScreen() {
    const [viewMode, setViewMode] = useState<'participating' | 'managing'>('participating');
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.fill}>
            {viewMode === 'managing' ? <ChallengeDashboard /> : <ParticipatingChallenges />}
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={viewMode === 'participating' ? 'Switch to managing challenges' : 'Switch to participating challenges'}
                accessibilityValue={{text: viewMode === 'participating' ? 'Participating challenges' : 'Managing challenges'}}
                onPress={() => {
                    Keyboard.dismiss();
                    setViewMode((current) => current === 'participating' ? 'managing' : 'participating');
                }}
                style={({pressed}) => [styles.toggleButton, {top: insets.top + 16}, pressed && styles.pressed]}
            >
                <Ionicons
                    name={viewMode === 'participating' ? 'settings-outline' : 'trophy-outline'}
                    size={24}
                    color={theme.colors.text}
                />
            </Pressable>
        </View>
    );
}
