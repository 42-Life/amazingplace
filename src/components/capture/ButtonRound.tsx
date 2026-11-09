// Key imports
import {Pressable, type ViewStyle} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
// import {buttonIcon} from '@/constants/styles';
import {PhotoButtonProps} from '@/constants/types'
import {theme} from '@/constants/theme'
import {photoCaptureStyles} from "@/constants/styles";


export default function ButtonRound({icon, label, onPress, corner, disabled, style}: PhotoButtonProps) {
    // get insets for safe area
    const insets = useSafeAreaInsets();

    // style of corners
    const cornerStyle: ViewStyle | undefined =
        corner
            ? {position: 'absolute', top: insets.top + 12, [corner]: 16}
            : undefined;

    // Button will contain an icon whose image is determined by the label input
    return (
        <Pressable
            style={[photoCaptureStyles.roundButton, cornerStyle, style]}
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label}
        >
            <Ionicons name={icon} size={26} color={theme.colors.buttonIconColor}/>
        </Pressable>
    )
}