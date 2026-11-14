// ACCOUNT SCREEN
// Lets the signed-in user change their username, email and password, or sign out.

// KEY IMPORTS
import TextInput from '@/components/KeyboardTextInput';
import {useEffect, useState} from 'react';
import {ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {theme} from '@/constants/theme';
import {authStyles as styles, screenShellStyles} from '@/constants/styles';
import {fetchMyAccount, signOut, updateEmail, updatePassword, updateUsername, type Account} from '@/lib/accounts';

// FIELD SECTION
// One labelled input with its own Save button and message line
function FieldSection({label, value, onChange, onSave, buttonText, secure, keyboardType, maxLength, placeholder, message}: {
    label: string
    value: string
    onChange: (text: string) => void
    onSave: () => Promise<string | void>      // returns a success message, or throws
    buttonText: string
    secure?: boolean
    keyboardType?: 'email-address'
    maxLength?: number
    placeholder?: string
    message?: string
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    async function save() {
        setBusy(true);
        setError(null);
        setNotice(null);
        try {
            const result = await onSave();
            setNotice(result || message || 'Saved.');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                secureTextEntry={secure}
                autoCapitalize="none"
                keyboardType={keyboardType}
                maxLength={maxLength}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.inactive}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            {notice && <Text style={styles.notice}>{notice}</Text>}
            <Pressable style={styles.button} onPress={save} disabled={busy}>
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{buttonText}</Text>}
            </Pressable>
        </>
    );
}

// MAIN FUNCTION
export default function AccountScreen() {
    const [account, setAccount] = useState<Account | null>(null);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loadError, setLoadError] = useState<string | null>(null);

    // Load the signed-in user's account once, when the screen opens, and fill in the fields
    useEffect(() => {
        fetchMyAccount()
            .then((a) => {
                setAccount(a);
                setUsername(a?.username ?? '');
                setEmail(a?.email ?? '');
            })
            .catch((e) => setLoadError(e instanceof Error ? e.message : 'Could not load your account.'));
    }, []);

    return (
        <SafeAreaView style={screenShellStyles.safe} edges={['top']}>
            <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
                    <Text style={styles.title}>Account</Text>
                    {loadError && <Text style={styles.error}>{loadError}</Text>}

                    {account ? (
                        <>
                            <FieldSection
                                label="Username"
                                value={username}
                                onChange={setUsername}
                                maxLength={20}
                                buttonText="Save username"
                                onSave={() => updateUsername(account.id, username)}
                            />
                            <FieldSection
                                label="Email"
                                value={email}
                                onChange={setEmail}
                                keyboardType="email-address"
                                buttonText="Save email"
                                message="Email updated. If you get a confirmation email, click its link to finish."
                                onSave={() => updateEmail(email)}
                            />
                            <FieldSection
                                label="New password"
                                value={password}
                                onChange={setPassword}
                                secure
                                placeholder="At least 6 characters"
                                buttonText="Save password"
                                onSave={async () => {
                                    await updatePassword(password);
                                    setPassword('');
                                    return 'Password updated.';
                                }}
                            />
                        </>
                    ) : !loadError && <ActivityIndicator color={theme.colors.active} />}

                    <Pressable style={styles.secondaryButton} onPress={() => signOut().catch((e) => console.error('Sign-out failed:', e))}>
                        <Text style={styles.secondaryButtonText}>Sign out</Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
