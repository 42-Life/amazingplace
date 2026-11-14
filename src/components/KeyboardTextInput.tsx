import {forwardRef, useId, type ComponentRef} from 'react';
import {Button, InputAccessoryView, Keyboard, Platform, StyleSheet, TextInput, View, type TextInputProps} from 'react-native';
import {theme} from '@/constants/theme';

// Keep dismissal consistent across forms, including multiline and email keyboards.
const KeyboardTextInput = forwardRef<ComponentRef<typeof TextInput>, TextInputProps>(function KeyboardTextInput(props, ref) {
    const accessoryId = useId();
    const isIOS = Platform.OS === 'ios';

    return (
        <>
            <TextInput
                ref={ref}
                returnKeyType={props.multiline ? 'default' : 'done'}
                submitBehavior={props.multiline ? 'newline' : 'blurAndSubmit'}
                onSubmitEditing={Keyboard.dismiss}
                {...props}
                inputAccessoryViewID={isIOS ? (props.inputAccessoryViewID ?? accessoryId) : undefined}
            />
            {isIOS && !props.inputAccessoryViewID && (
                <InputAccessoryView nativeID={accessoryId}>
                    <View style={styles.toolbar}>
                        <Button title="Done" onPress={Keyboard.dismiss} />
                    </View>
                </InputAccessoryView>
            )}
        </>
    );
});

const styles = StyleSheet.create({
    toolbar: {
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: theme.colors.background,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.tabBarBorder,
    },
});

export default KeyboardTextInput;
