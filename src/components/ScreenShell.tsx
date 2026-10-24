// Shared wrapper for each page. Creates a safe area in which content should go, separate from BG

// KEY IMPORTS
import { ReactNode } from "react"
import { Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { screenShellStyles } from "@/constants/styles";

// MAIN FUNCTION

export default function ScreenShell({title, children}:{title?:string, children?:ReactNode}) {
    return(
        <SafeAreaView style={screenShellStyles.safe} edges={['top']}>
            <View style={screenShellStyles.container}>
                {/* Text is only here for now. Each page will be personalised once skeleton setup is complete */}
                <Text style={screenShellStyles.title}>{title}</Text>
                {children}
            </View>
        </SafeAreaView>
    );
}

