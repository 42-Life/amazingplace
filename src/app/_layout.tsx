// ROOT LAYOUT
// The first thing that loads when the app opens. Wraps every screen in the app.

// KEY IMPORTS
import {useEffect} from "react";
import {StatusBar} from "expo-status-bar";
import {Stack} from "expo-router";
import {supabase} from "@/lib/supabase";

// MAIN FUNCTION
export default function RootLayout() {

    // ON APP LAUNCH: make sure the user is signed in
    useEffect(() => {
        (async () => {
            // STEP 1: Check whether this phone already has a saved session
            const {data: {session}} = await supabase.auth.getSession();

            // STEP 2: If not, sign in anonymously
            //   This gives the phone its own user ID with no signup screen,
            //   so photos can be linked to whoever took them
            if (!session) {
                const {error} = await supabase.auth.signInAnonymously();
                if (error) console.error("Anonymous sign-in failed:", error.message);
            }
        })();
    }, []);   // empty array = run once, when the app first opens

    // RENDER: status bar plus the screen stack (no top header, the tabs handle navigation)
    return(
        <>
            <StatusBar style={"dark"}></StatusBar>
            <Stack screenOptions={{headerShown: false}}></Stack>
        </>
    )
}
