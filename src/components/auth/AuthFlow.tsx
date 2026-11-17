//
// import { useState } from 'react';
// import {
//     ActivityIndicator,
//     KeyboardAvoidingView,
//     Platform,
//     Pressable,
//     ScrollView,
//     Text,
//     View,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { Ionicons } from '@expo/vector-icons';
//
// import TextInput from '@/components/KeyboardTextInput';
// import { theme } from '@/constants/theme';
// import { authStyles as styles } from '@/constants/styles';
// import { signIn, signUp } from '@/lib/accounts';
//
// // STEP 1: Define all available authentication screens
// type Screen =
//     | 'welcome'
//     | 'options'
//     | 'email'
//     | 'verification'
//     | 'profile'
//     | 'error';
//
// // STEP 2: Define the authentication modes.
// type AuthMode = 'signIn' | 'signUp';
//
// type Props = {
//     demoMode?: boolean;
// };
//
// export default function AuthFlow({ demoMode = false }: Props) {
//     const { colors } = theme;
//
//     const [screen, setScreen] = useState<Screen>('welcome');
//     const [mode, setMode] = useState<AuthMode>('signUp');
//
//     const [email, setEmail] = useState('');
//     const [username, setUsername] = useState('');
//     const [password, setPassword] = useState('');
//     const [code, setCode] = useState('');
//
//     const [busy, setBusy] = useState(false);
//     const [error, setError] = useState<string | null>(null);
//     const [notice, setNotice] = useState<string | null>(null);
//
//     function resetMessages() {
//         setError(null);
//         setNotice(null);
//     }
//
//     function startSignUp() {
//         setMode('signUp');
//         resetMessages();
//         setScreen('options');
//     }
//
//     function startSignIn() {
//         setMode('signIn');
//         resetMessages();
//         setScreen('options');
//     }
//
//     async function submitEmail() {
//         resetMessages();
//         setBusy(true);
//
//         try {
//             if (demoMode) {
//                 // No real authentication in presentation mode.
//                 setScreen(mode === 'signUp' ? 'verification' : 'profile');
//                 return;
//             }
//
//             if (mode === 'signIn') {
//                 await signIn(email, password);
//             } else {
//                 const signedIn = await signUp(email, password, username);
//
//                 if (!signedIn) {
//                     // Your current backend uses email confirmation.
//                     setNotice(
//                         'Check your email for a confirmation link, then sign in.'
//                     );
//                 }
//             }
//         } catch (e) {
//             setError(
//                 e instanceof Error ? e.message : 'Something went wrong.'
//             );
//             setScreen('error');
//         } finally {
//             setBusy(false);
//         }
//     }
//
//     function continueDemo() {
//         if (demoMode) {
//             if (screen === 'verification') {
//                 setScreen('profile');
//             } else if (screen === 'profile') {
//                 setNotice('Demo account created successfully!');
//             }
//         }
//     }
//
//     const button = (label: string, action: () => void) => (
//         <Pressable style={styles.button} onPress={action}>
//             <Text style={styles.buttonText}>{label}</Text>
//         </Pressable>
//     );
//
//     const heading = (title: string, subtitle: string) => (
//         <>
//             <Text style={styles.title}>{title}</Text>
//             <Text style={styles.subtitle}>{subtitle}</Text>
//         </>
//     );
//
//     return (
//         <SafeAreaView
//             style={{ flex: 1, backgroundColor: colors.background }}
//         >
//             <KeyboardAvoidingView
//                 style={{ flex: 1 }}
//                 behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//             >
//                 <ScrollView
//                     contentContainerStyle={styles.content}
//                     keyboardShouldPersistTaps="handled"
//                 >
//
//                     {/* WELCOME */}
//                     {screen === 'welcome' && (
//                         <View style={styles.centered}>
//                             <Text style={styles.brand}>Amazing Place</Text>
//                             <Text style={styles.subtitle}>
//                                 Real Places.{"\n"}Real Photos.
//                             </Text>
//
//                             <View style={styles.bottomActions}>
//                                 {button('Get Started', startSignUp)}
//                                 {button('Login', startSignIn)}
//                             </View>
//                         </View>
//                     )}
//
//                     {/* AUTHENTICATION OPTIONS */}
//                     {screen === 'options' && (
//                         <>
//                             {heading(
//                                 mode === 'signUp' ? 'Create an account' : 'Sign in',
//                                 'Choose how you want to continue.'
//                             )}
//
//                             {button('Login With Google', () => {
//                                 setError('Google authentication is not configured yet.');
//                                 setScreen('error');
//                             })}
//
//                             {button('Login with Apple', () => {
//                                 setError('Apple authentication is not configured yet.');
//                                 setScreen('error');
//                             })}
//
//                             {button('Login with Email', () => setScreen('email'))}
//
//                             <Pressable onPress={() => setScreen('welcome')}>
//                                 <Text style={styles.switchText}>Back</Text>
//                             </Pressable>
//                         </>
//                     )}
//
//                     {/* EMAIL LOGIN / SIGNUP */}
//                     {screen === 'email' && (
//                         <>
//                             {heading(
//                                 mode === 'signUp' ? 'Create your account' : 'Log in with email',
//                                 'Enter your details to continue.'
//                             )}
//
//                             <Text style={styles.label}>Email</Text>
//                             <TextInput
//                                 style={styles.input}
//                                 value={email}
//                                 onChangeText={setEmail}
//                                 autoCapitalize="none"
//                                 autoComplete="email"
//                                 keyboardType="email-address"
//                                 placeholder="Email address"
//                                 placeholderTextColor={colors.inactive}
//                             />
//
//                             {mode === 'signUp' && (
//                                 <>
//                                     <Text style={styles.label}>Username</Text>
//                                     <TextInput
//                                         style={styles.input}
//                                         value={username}
//                                         onChangeText={setUsername}
//                                         autoCapitalize="none"
//                                         maxLength={20}
//                                         placeholder="3 to 20 characters"
//                                         placeholderTextColor={colors.inactive}
//                                     />
//                                 </>
//                             )}
//
//                             <Text style={styles.label}>Password</Text>
//                             <TextInput
//                                 style={styles.input}
//                                 value={password}
//                                 onChangeText={setPassword}
//                                 secureTextEntry
//                                 autoCapitalize="none"
//                                 autoComplete={
//                                     mode === 'signUp'
//                                         ? 'new-password'
//                                         : 'current-password'
//                                 }
//                                 placeholder="Password"
//                                 placeholderTextColor={colors.inactive}
//                             />
//
//                             {error && <Text style={styles.error}>{error}</Text>}
//                             {notice && <Text style={styles.notice}>{notice}</Text>}
//
//                             <Pressable
//                                 style={styles.button}
//                                 onPress={submitEmail}
//                                 disabled={busy}
//                             >
//                                 {busy ? (
//                                     <ActivityIndicator color="#FFFFFF" />
//                                 ) : (
//                                     <Text style={styles.buttonText}>
//                                         {mode === 'signUp' ? 'Create Account' : 'Sign In'}
//                                     </Text>
//                                 )}
//                             </Pressable>
//
//                             <Pressable
//                                 onPress={() => {
//                                     setMode(mode === 'signUp' ? 'signIn' : 'signUp');
//                                     resetMessages();
//                                 }}
//                             >
//                                 <Text style={styles.switchText}>
//                                     {mode === 'signUp'
//                                         ? 'Already have an account? Sign in'
//                                         : 'New here? Create an account'}
//                                 </Text>
//                             </Pressable>
//                         </>
//                     )}
//
//                     {/* EMAIL VERIFICATION: DEMO / UI PLACEHOLDER */}
//                     {screen === 'verification' && (
//                         <>
//                             {heading(
//                                 'Check your email',
//                                 `Enter the six-digit code sent to ${email || 'your email'}.`
//                             )}
//
//                             <TextInput
//                                 style={styles.input}
//                                 value={code}
//                                 onChangeText={setCode}
//                                 keyboardType="number-pad"
//                                 maxLength={6}
//                                 placeholder="000000"
//                                 placeholderTextColor={colors.inactive}
//                             />
//
//                             {demoMode
//                                 ? button('Verify', continueDemo)
//                                 : (
//                                     <Text style={styles.notice}>
//                                         Connect your email verification function here.
//                                     </Text>
//                                 )}
//                         </>
//                     )}
//
//                     {/* CREATE PROFILE */}
//                     {screen === 'profile' && (
//                         <>
//                             {heading(
//                                 'Create Profile',
//                                 'Your account is ready. Tell us a little about yourself.'
//                             )}
//
//                             <Text style={styles.label}>Display name</Text>
//                             <TextInput
//                                 style={styles.input}
//                                 value={username}
//                                 onChangeText={setUsername}
//                                 placeholder="Your name"
//                                 placeholderTextColor={colors.inactive}
//                             />
//
//                             {demoMode && button('Start Exploring', continueDemo)}
//                         </>
//                     )}
//
//                     {/* ERROR */}
//                     {screen === 'error' && (
//                         <>
//                             {heading('Sign-in error', 'Something went wrong.')}
//
//                             <Text style={styles.error}>
//                                 {error || 'Please try again.'}
//                             </Text>
//
//                             {button('Try Again', () => setScreen('email'))}
//
//                             <Pressable onPress={() => setScreen('options')}>
//                                 <Text style={styles.switchText}>Back to sign-in options</Text>
//                             </Pressable>
//                         </>
//                     )}
//
//                     {demoMode && (
//                         <Text style={styles.demoLabel}>
//                             PRESENTATION MODE
//                         </Text>
//                     )}
//
//                 </ScrollView>
//             </KeyboardAvoidingView>
//         </SafeAreaView>
//     );
// }

import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import TextInput from '@/components/KeyboardTextInput';
import { theme } from '@/constants/theme';
import { authStyles as styles } from '@/constants/styles';
import { signIn, signUp } from '@/lib/accounts';

// ============================================================
// STEP 1: DEFINE THE SCREENS IN THE AUTHENTICATION JOURNEY
// ============================================================
// This type is a list of every screen that this component can show.
// Using a TypeScript union means we can only set `screen` to one of
// these exact values. This helps prevent spelling mistakes and bugs.
type Screen =
    | 'welcome'       // First screen: user chooses Login or Get Started.
    | 'options'       // User chooses Google, Apple, or Email.
    | 'email'         // User enters their email and password.
    | 'verification'  // Sign-up confirmation / demo verification screen.
    | 'profile'       // Screen for entering a display name.
    | 'error';        // Screen that displays an authentication error.

// ============================================================
// STEP 2: DEFINE THE AUTHENTICATION MODE
// ============================================================
// The app has two possible authentication modes:
// - signIn: an existing user is trying to access their account.
// - signUp: a new user is creating an account.
//
// Keeping this separate from `screen` is important. For example,
// both sign-in and sign-up users can be on the email screen.
type AuthMode = 'signIn' | 'signUp';

// ============================================================
// STEP 3: DEFINE THE COMPONENT'S PROPS
// ============================================================
// `demoMode` is optional. If it is true, the flow demonstrates the
// screens without contacting the real authentication backend.
// If it is not provided, it defaults to false.
type Props = {
    demoMode?: boolean;
};

// ============================================================
// STEP 4: CREATE THE AUTHENTICATION COMPONENT
// ============================================================
export default function AuthFlow({ demoMode = false }: Props) {
    // STEP 4.1: Get the app's shared theme colours.
    // These colours are used for backgrounds, placeholders, and other UI.
    const { colors } = theme;

    // STEP 4.2: Track which screen the user is currently viewing.
    // The flow starts on the welcome screen.
    const [screen, setScreen] = useState<Screen>('welcome');

    // STEP 4.3: Track whether the user is signing in or signing up.
    // The initial mode is sign-up, which is used by the Get Started button.
    const [mode, setMode] = useState<AuthMode>('signUp');

    // STEP 4.4: Store the values entered into the form.
    // Each value has its own state so the inputs can update independently.
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');

    // STEP 4.5: Track the status and messages for authentication.
    // `busy` prevents repeated submissions while a request is running.
    // `error` displays a problem; `notice` displays helpful information.
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    // ========================================================
    // STEP 5: CREATE A FUNCTION TO CLEAR OLD MESSAGES
    // ========================================================
    // Before starting a new action, remove any old error or notice.
    // This prevents a message from a previous attempt appearing on
    // a different screen or during a new authentication attempt.
    function resetMessages() {
        setError(null);
        setNotice(null);
    }

    // ========================================================
    // STEP 6: START THE SIGN-UP JOURNEY
    // ========================================================
    // This function runs when the user selects "Get Started".
    // 6.1: Set the authentication mode to sign-up.
    // 6.2: Clear any messages left over from a previous attempt.
    // 6.3: Show the authentication options screen.
    function startSignUp() {
        setMode('signUp');
        resetMessages();
        setScreen('options');
    }

    // ========================================================
    // STEP 7: START THE SIGN-IN JOURNEY
    // ========================================================
    // This function runs when the user selects "Login".
    // It follows the same pattern as sign-up, but sets the mode
    // to sign-in so the email form and submit function know what to do.
    function startSignIn() {
        setMode('signIn');
        resetMessages();
        setScreen('options');
    }

    // ========================================================
    // STEP 8: SUBMIT THE EMAIL AUTHENTICATION FORM
    // ========================================================
    // This function handles both email sign-in and email sign-up.
    // The `mode` state determines which authentication function runs.
    async function submitEmail() {
        // 8.1: Clear old messages and show the loading state.
        resetMessages();
        setBusy(true);

        try {
            // 8.2: If demo mode is active, do not contact the backend.
            // Instead, move to the next screen in the demonstration.
            if (demoMode) {
                setScreen(mode === 'signUp' ? 'verification' : 'profile');
                return;
            }

            // 8.3: If the user is signing in, authenticate the existing
            // account with the email and password they entered.
            if (mode === 'signIn') {
                await signIn(email, password);
            } else {
                // 8.4: Otherwise, create a new account using the email,
                // password, and username entered on the sign-up form.
                const signedIn = await signUp(email, password, username);

                // 8.5: If the backend requires email confirmation,
                // show a message telling the user what to do next.
                if (!signedIn) {
                    setNotice(
                        'Check your email for a confirmation link, then sign in.'
                    );
                }
            }
        } catch (e) {
            // 8.6: If authentication fails, display the error message.
            // Use a general fallback message if the thrown value is
            // not a standard JavaScript Error object.
            setError(
                e instanceof Error ? e.message : 'Something went wrong.'
            );

            // 8.7: Show the error screen so the user can retry or
            // return to the authentication options.
            setScreen('error');
        } finally {
            // 8.8: Always stop the loading indicator, whether the
            // authentication succeeds, fails, or demo mode is used.
            setBusy(false);
        }
    }

    // ========================================================
    // STEP 9: HANDLE THE DEMO FLOW
    // ========================================================
    // This function is only used by the presentation/demo screens.
    // It allows the presenter to move through the flow without
    // needing a real verification service or account creation.
    function continueDemo() {
        // 9.1: Only allow these actions when demo mode is enabled.
        if (demoMode) {
            // 9.2: Move from the verification screen to the profile screen.
            if (screen === 'verification') {
                setScreen('profile');
            } else if (screen === 'profile') {
                // 9.3: Show a success message when the demo profile is ready.
                setNotice('Demo account created successfully!');
            }
        }
    }

    // ========================================================
    // STEP 10: CREATE A REUSABLE BUTTON HELPER
    // ========================================================
    // Instead of writing the same button JSX repeatedly, this helper
    // accepts a label and an action, then returns a styled button.
    //
    // Example:
    // button('Login', startSignIn)
    //
    // This keeps the UI shorter and makes buttons consistent.
    const button = (label: string, action: () => void) => (
        <Pressable style={styles.button} onPress={action}>
            <Text style={styles.buttonText}>{label}</Text>
        </Pressable>
    );

    // ========================================================
    // STEP 11: CREATE A REUSABLE HEADING HELPER
    // ========================================================
    // Many screens have a title and a short description.
    // This helper displays both using the shared heading styles.
    const heading = (title: string, subtitle: string) => (
        <>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
        </>
    );

    // ============================================================
    // STEP 12: RENDER THE AUTHENTICATION USER INTERFACE
    // ============================================================
    // React Native renders the screen that matches the current
    // `screen` state. When setScreen(...) is called, this UI updates.
    return (
        // STEP 12.1: SafeAreaView keeps the content clear of device
        // features such as the notch, status bar, and home indicator.
        <SafeAreaView
            style={{ flex: 1, backgroundColor: colors.background }}
        >
            {/* STEP 12.2: KeyboardAvoidingView moves content when the
                keyboard opens, helping keep the active input visible. */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* STEP 12.3: ScrollView allows the screen to scroll,
                    especially when the keyboard or a small display
                    leaves limited vertical space. */}
                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* =================================================
                        STEP 13: WELCOME SCREEN
                        =================================================
                        This is the first screen users see. They can
                        either begin creating an account or log in. */}
                    {screen === 'welcome' && (
                        <View style={styles.centered}>
                            <Text style={styles.brand}>Amazing Place</Text>
                            <Text style={styles.subtitle}>
                                Real Places.{"\n"}Real Photos.
                            </Text>

                            {/* STEP 13.1: Display the two starting actions. */}
                            <View style={styles.bottomActions}>
                                {button('Get Started', startSignUp)}
                                {button('Login', startSignIn)}
                            </View>
                        </View>
                    )}

                    {/* =================================================
                        STEP 14: AUTHENTICATION OPTIONS SCREEN
                        =================================================
                        This screen lets users choose how they want
                        to create an account or sign in. */}
                    {screen === 'options' && (
                        <>
                            {/* STEP 14.1: Change the heading based on mode. */}
                            {heading(
                                mode === 'signUp' ? 'Create an account' : 'Sign in',
                                'Choose how you want to continue.'
                            )}

                            {/* STEP 14.2: Google authentication option.
                                It currently displays an error because
                                Google authentication is not configured. */}
                            {button('Login With Google', () => {
                                setError('Google authentication is not configured yet.');
                                setScreen('error');
                            })}

                            {/* STEP 14.3: Apple authentication option.
                                It currently displays an error because
                                Apple authentication is not configured. */}
                            {button('Login with Apple', () => {
                                setError('Apple authentication is not configured yet.');
                                setScreen('error');
                            })}

                            {/* STEP 14.4: Email option.
                                Selecting this opens the email form. */}
                            {button('Login with Email', () => setScreen('email'))}

                            {/* STEP 14.5: Return to the welcome screen. */}
                            <Pressable onPress={() => setScreen('welcome')}>
                                <Text style={styles.switchText}>Back</Text>
                            </Pressable>
                        </>
                    )}

                    {/* =================================================
                        STEP 15: EMAIL SIGN-IN / SIGN-UP SCREEN
                        =================================================
                        This screen collects the user's email and password.
                        For sign-up, it also asks for a username. */}
                    {screen === 'email' && (
                        <>
                            {/* STEP 15.1: Display a heading appropriate
                                to the current authentication mode. */}
                            {heading(
                                mode === 'signUp' ? 'Create your account' : 'Log in with email',
                                'Enter your details to continue.'
                            )}

                            {/* STEP 15.2: Email input.
                                The value is controlled by the `email` state.
                                Every change updates that state. */}
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                autoComplete="email"
                                keyboardType="email-address"
                                placeholder="Email address"
                                placeholderTextColor={colors.inactive}
                            />

                            {/* STEP 15.3: Only ask for a username during
                                sign-up. Existing users do not need one
                                to sign in. */}
                            {mode === 'signUp' && (
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

                            {/* STEP 15.4: Password input.
                                `secureTextEntry` hides the password.
                                The autocomplete hint changes depending
                                on whether the user is signing up or in. */}
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoCapitalize="none"
                                autoComplete={
                                    mode === 'signUp'
                                        ? 'new-password'
                                        : 'current-password'
                                }
                                placeholder="Password"
                                placeholderTextColor={colors.inactive}
                            />

                            {/* STEP 15.5: Display any error or notice
                                returned by the authentication process. */}
                            {error && <Text style={styles.error}>{error}</Text>}
                            {notice && <Text style={styles.notice}>{notice}</Text>}

                            {/* STEP 15.6: Submit the email form.
                                While busy, show a spinner and disable
                                the button to prevent duplicate requests. */}
                            <Pressable
                                style={styles.button}
                                onPress={submitEmail}
                                disabled={busy}
                            >
                                {busy ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.buttonText}>
                                        {mode === 'signUp' ? 'Create Account' : 'Sign In'}
                                    </Text>
                                )}
                            </Pressable>

                            {/* STEP 15.7: Allow users to switch between
                                sign-in and sign-up without leaving email.
                                Clear old messages when they switch modes. */}
                            <Pressable
                                onPress={() => {
                                    setMode(mode === 'signUp' ? 'signIn' : 'signUp');
                                    resetMessages();
                                }}
                            >
                                <Text style={styles.switchText}>
                                    {mode === 'signUp'
                                        ? 'Already have an account? Sign in'
                                        : 'New here? Create an account'}
                                </Text>
                            </Pressable>

                            {/* STEP 15.8: NEW BACK LINK.
                                This gives email users the same way back
                                to the authentication choices that is
                                available after Google or Apple errors.
                                The current sign-in/sign-up mode is kept. */}
                            <Pressable
                                onPress={() => {
                                    resetMessages();
                                    setScreen('options');
                                }}
                            >
                                <Text style={styles.switchText}>
                                    Back to sign-in options
                                </Text>
                            </Pressable>
                        </>
                    )}

                    {/* =================================================
                        STEP 16: EMAIL VERIFICATION SCREEN
                        =================================================
                        This is currently a UI placeholder for the
                        verification flow. A real verification function
                        still needs to be connected. */}
                    {screen === 'verification' && (
                        <>
                            {/* STEP 16.1: Tell the user to check their email. */}
                            {heading(
                                'Check your email',
                                `Enter the six-digit code sent to ${email || 'your email'}.`
                            )}

                            {/* STEP 16.2: Collect the six-digit code. */}
                            <TextInput
                                style={styles.input}
                                value={code}
                                onChangeText={setCode}
                                keyboardType="number-pad"
                                maxLength={6}
                                placeholder="000000"
                                placeholderTextColor={colors.inactive}
                            />

                            {/* STEP 16.3: In demo mode, allow the user
                                to continue. Otherwise, explain that the
                                real verification function is not connected. */}
                            {demoMode
                                ? button('Verify', continueDemo)
                                : (
                                    <Text style={styles.notice}>
                                        Connect your email verification function here.
                                    </Text>
                                )}
                        </>
                    )}

                    {/* =================================================
                        STEP 17: PROFILE CREATION SCREEN
                        =================================================
                        This screen collects a display name after the
                        account has been created or during the demo flow. */}
                    {screen === 'profile' && (
                        <>
                            {/* STEP 17.1: Explain that the account is ready. */}
                            {heading(
                                'Create Profile',
                                'Your account is ready. Tell us a little about yourself.'
                            )}

                            {/* STEP 17.2: Collect the user's display name. */}
                            <Text style={styles.label}>Display name</Text>
                            <TextInput
                                style={styles.input}
                                value={username}
                                onChangeText={setUsername}
                                placeholder="Your name"
                                placeholderTextColor={colors.inactive}
                            />

                            {/* STEP 17.3: Only show this demo action when
                                presentation mode is enabled. */}
                            {demoMode && button('Start Exploring', continueDemo)}
                        </>
                    )}

                    {/* =================================================
                        STEP 18: ERROR SCREEN
                        =================================================
                        This screen appears when an authentication option
                        or email authentication attempt reports an error. */}
                    {screen === 'error' && (
                        <>
                            {/* STEP 18.1: Display the error heading. */}
                            {heading('Sign-in error', 'Something went wrong.')}

                            {/* STEP 18.2: Show the specific error when
                                available, or a general fallback message. */}
                            <Text style={styles.error}>
                                {error || 'Please try again.'}
                            </Text>

                            {/* STEP 18.3: Let the user retry the email form. */}
                            {button('Try Again', () => setScreen('email'))}

                            {/* STEP 18.4: Let the user choose another
                                authentication method, such as Google,
                                Apple, or Email. */}
                            <Pressable
                                onPress={() => {
                                    resetMessages();
                                    setScreen('options');
                                }}
                            >
                                <Text style={styles.switchText}>
                                    Back to sign-in options
                                </Text>
                            </Pressable>
                        </>
                    )}

                    {/* =================================================
                        STEP 19: SHOW THE DEMO MODE LABEL
                        =================================================
                        This label appears at the bottom of every screen
                        when the component is running in presentation mode. */}
                    {demoMode && (
                        <Text style={styles.demoLabel}>
                            PRESENTATION MODE
                        </Text>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
