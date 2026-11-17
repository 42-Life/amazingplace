
import React from 'react';
import {
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { authStyles } from '@/constants/styles';

// Functions supplied by the parent layout to open AuthForm.
type WelcomeProps = {
    onGetStarted: () => void;
    onLogin: () => void;
};

export default function WelcomeScreen({
                                          onGetStarted,
                                          onLogin,
                                      }: WelcomeProps) {

    // Reuse the authentication styles already used in AuthFlow.
    const styles = authStyles;
    const { colors } = theme;

    // Reusable button, matching the AuthFlow button helper.
    const button = (label: string, action: () => void) => (
        <Pressable
            style={styles.button}
            onPress={action}
        >
            <Text style={styles.buttonText}>{label}</Text>
        </Pressable>
    );

    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: colors.background,
            }}
        >
            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    welcomeStyles.scrollContent,
                ]}
                keyboardShouldPersistTaps="handled"
            >
                {/* WELCOME SCREEN */}
                <View style={welcomeStyles.centered}>

                    {/* APP NAME */}
                    <Text style={welcomeStyles.brand}>
                        Amazing Place
                    </Text>

                    {/* TAGLINE */}
                    <Text style={styles.subtitle}>
                        Real Places.{"\n"}Real Photos.
                    </Text>

                    {/* STARTING ACTIONS */}
                    <View style={welcomeStyles.bottomActions}>
                        {button('Get Started', onGetStarted)}
                        {button('Login', onLogin)}
                    </View>

                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// Styles specific to the welcome screen.
// Buttons and text styles are reused from authStyles.
const welcomeStyles = {
    scrollContent: {
        flexGrow: 1,
    },
    centered: {
        flex: 1,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        padding: 24,
        gap: 12,
    },
    brand: {
        fontSize: 32,
        fontWeight: '700' as const,
        color: theme.colors.text,
        textAlign: 'center' as const,
    },
    bottomActions: {
        width: '100%' as const,
        marginTop: 24,
        gap: 8,
    },
};
