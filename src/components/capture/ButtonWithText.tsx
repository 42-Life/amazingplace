// Key imports
import {Pressable, Text, type StyleProp, type ViewStyle} from 'react-native';
import {theme} from '@/constants/theme';
import {photoCaptureStyles} from '@/constants/styles';
import {TextButtonProps} from "@/constants/types";

// main functionality
export default function ButtonWithText({label, onPress, variant = 'primary', disabled, style}: TextButtonProps) {
    const VariantStyle =
        variant === 'primary'
            ? {backgroundColor: theme.colors.active}
            : photoCaptureStyles.secondary;

    return(
        <Pressable
            style={[photoCaptureStyles.textButton, VariantStyle, style]}
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
        >
            <Text style={photoCaptureStyles.textButtonLabel}>{label}</Text>
        </Pressable>
    )
}