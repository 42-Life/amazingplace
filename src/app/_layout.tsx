// ROOT LAYOUT
// The first thing that loads when the app opens. Wraps every screen in the app.
// Signed-out users only see the sign-in form; signed-in users see the tabs.

// KEY IMPORTS
import {useEffect, useState} from "react";
import {StatusBar} from "expo-status-bar";
import {Stack} from "expo-router";
import type {Session} from "@supabase/supabase-js";
import {supabase} from "@/lib/supabase";
import AuthForm from "@/components/auth/AuthForm";
import AuthWelcome from "@/components/auth/AuthWelcome";
import AuthFlow from "@/components/auth/AuthFlow";
import WelcomeScreen from "@/components/auth/AuthWelcome";

// DEV BYPASS
const DEV_BYPASS_LOGIN = __DEV__;

type AuthMode = 'signIn' | 'signUp';

// MAIN FUNCTION
export default function RootLayout() {
    // undefined = still checking for a saved session, null = signed out
    const [session, setSession] = useState<Session | null | undefined>(undefined);
    const [authMode, setAuthMode] = useState<AuthMode | null>(null);
    // const [showAuthForm, setShowAuthForm] = useState(false);

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
    return(
        <>
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
        </>
    )
}
