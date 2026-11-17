// ROOT LAYOUT
// The first thing that loads when the app opens. Wraps every screen in the app.
// Signed-out users only see the sign-in form; signed-in users see the tabs.

// KEY IMPORTS
import {useEffect, useState} from "react";
import {StatusBar} from "expo-status-bar";
import {Stack} from "expo-router";
import type {Session} from "@supabase/supabase-js";
import {StripeProvider} from "@stripe/stripe-react-native";
import {supabase} from "@/lib/supabase";
import {STRIPE_PUBLISHABLE_KEY, STRIPE_URL_SCHEME} from "@/lib/stripe";
import AuthForm from "@/components/auth/AuthForm";
import WelcomeScreen from "@/components/auth/AuthWelcome";

// DEV BYPASS
const DEV_BYPASS_LOGIN = __DEV__;

type AuthMode = 'signIn' | 'signUp';

// MAIN FUNCTION
export default function RootLayout() {
    // undefined = still checking for a saved session, null = signed out
    const [session, setSession] = useState<Session | null | undefined>(undefined);
    const [authMode, setAuthMode] = useState<AuthMode | null>(null);

    // ON APP LAUNCH: load the saved session, then keep it up to date as users sign in and out
    useEffect(() => {
        supabase.auth.getSession().then(({data}) => setSession(data.session));
        const {data: listener} = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
        return () => listener.subscription.unsubscribe();
    }, []);

    // Wait for the saved session to load, so signed-in users don't see the form flash up
    if (session === undefined) return null;

    // RENDER: status bar plus either the sign-in form or the screen stack
    //   (no top header, the tabs handle navigation)
    //   StripeProvider wraps everything so any screen can open the payment sheet.
    //   urlScheme is how a bank's 3D Secure page gets back to the app afterwards.
    //   With no key set the provider is harmless; paid challenges explain themselves instead.
    return(
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} urlScheme={STRIPE_URL_SCHEME}>
            <StatusBar style={"auto"}></StatusBar>
            {session
                ? (
                    <Stack screenOptions={{headerShown: false}}/>
                ) : authMode !== null ? (
                    <AuthForm
                        key={authMode}
                        initialMode={authMode}
                        onBack={() => setAuthMode(null)}
                    />
                ) : (
                    <WelcomeScreen
                        onGetStarted={() => setAuthMode('signUp')}
                        onLogin={() => setAuthMode('signIn')}
                    />
                )
            }
        </StripeProvider>
    )
}
