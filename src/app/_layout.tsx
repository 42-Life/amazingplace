// KEY IMPORTS
import {StatusBar} from "expo-status-bar";
import {Stack} from "expo-router";

// MAIN FUNCTION

export default function RootLayout() {
    return(
        <>
            <StatusBar style={"dark"}></StatusBar>
            <Stack screenOptions={{headerShown: false}}></Stack>
        </>
    )
}