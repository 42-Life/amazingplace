// AUTH FORM
// One form for both creating an account and signing in. A link at the bottom switches between them.

// KEY IMPORTS
import {useState} from 'react';
import {ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {theme} from '@/constants/theme';
import {authStyles as styles} from '@/constants/styles';
import {signIn, signUp} from '@/lib/accounts';

// MAIN FUNCTION
export default function AuthForm() {
    const {colors} = theme;

    // STATE: which mode we're in, what's typed, and what to tell the user
    const [mode, setMode] = useState<'signIn' | 'signUp'>('signUp');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    // SUBMIT: sign in or sign up. On success the root layout notices the new session and swaps screens.
    async function submit() {
        setBusy(true);
        setError(null);
        setNotice(null);
        try {
            if (mode === 'signIn') {
                await signIn(email, password);
            } else {
                const signedIn = await signUp(email, password, username);
                if (!signedIn) setNotice('Check your email for a confirmation link, then sign in.');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong.');
        } finally {
            setBusy(false);
        }
    }

    const isSignUp = mode === 'signUp';
    return (
        <SafeAreaView style={{flex: 1, backgroundColor: colors.background}}>
            <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <Text style={styles.title}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
                    <Text style={styles.subtitle}>
                        {isSignUp ? 'Sign up to start entering challenges.' : 'Welcome back.'}
                    </Text>

                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        placeholderTextColor={colors.inactive}
                    />

                    {isSignUp && (
                        <>
                            <Text style={styles.label}>Username</Text>
                            <TextInput
                                style={styles.input}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                maxLength={20}
                                placeholder="3 to 20 characters"
                                placeholderTextColor={colors.inactive}
                            />
                        </>
                    )}

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        autoComplete={isSignUp ? 'new-password' : 'current-password'}
                        placeholder={isSignUp ? 'At least 6 characters' : undefined}
                        placeholderTextColor={colors.inactive}
                    />

                    {error && <Text style={styles.error}>{error}</Text>}
                    {notice && <Text style={styles.notice}>{notice}</Text>}

                    <Pressable style={styles.button} onPress={submit} disabled={busy}>
                        {busy
                            ? <ActivityIndicator color="#FFFFFF" />
                            : <Text style={styles.buttonText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>}
                    </Pressable>

                    <Pressable onPress={() => { setMode(isSignUp ? 'signIn' : 'signUp'); setError(null); setNotice(null); }}>
                        <Text style={styles.switchText}>
                            {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
                        </Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
