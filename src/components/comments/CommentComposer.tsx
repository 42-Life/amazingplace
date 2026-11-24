// COMMENT COMPOSER
// The text box at the bottom of the submission page. It does two jobs:
//   - writing a new comment (the default)
//   - editing one of the user's own comments (when `editing` is given): the box starts with
//     that comment's text, a strip above it says so, and the button saves instead of posting
// This component only collects the text; the submission page saves it (onSubmit).

import {useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import TextInput from '@/components/KeyboardTextInput';
import {theme} from '@/constants/theme';
import type {Comment} from '@/constants/types';
import {MAX_COMMENT_LENGTH} from '@/lib/comments';

// Show the character count once the user is this close to the limit
const SHOW_COUNT_FROM = MAX_COMMENT_LENGTH - 100;

type Props = {
    editing: Comment | null;                    // the comment being edited, or null when writing a new one
    onSubmit: (text: string) => Promise<void>;  // saves the text; throws with a readable message if it can't
    onCancelEdit: () => void;
    bottomInset?: number;                       // room for the phone's home bar
};

// The page gives this a new `key` when `editing` changes, which is what resets the text box.
export default function CommentComposer({editing, onSubmit, onCancelEdit, bottomInset = 0}: Props) {
    const {colors} = theme;
    const [text, setText] = useState(editing?.body ?? '');
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const trimmed = text.trim();
    // Nothing to send if it's empty, or if an edit hasn't changed anything
    const canSubmit = trimmed.length > 0 && !isSaving && trimmed !== editing?.body;

    async function submit() {
        if (!canSubmit) return;
        setIsSaving(true);
        setErrorMessage(null);
        try {
            await onSubmit(trimmed);
            setText('');   // only clear once it's saved, so a failed comment isn't lost
        } catch (err: any) {
            setErrorMessage(err?.message ?? 'Could not save your comment. Please try again.');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <View style={[styles.container, {paddingBottom: 8 + bottomInset}]}>
            {/* 1. Editing strip: says which mode the box is in, with a way out */}
            {editing && (
                <View style={styles.editingRow}>
                    <Text style={styles.editingText}>Editing your comment</Text>
                    <Pressable onPress={onCancelEdit} disabled={isSaving} accessibilityRole="button" accessibilityLabel="Cancel editing" hitSlop={10}>
                        <Text style={styles.link}>Cancel</Text>
                    </Pressable>
                </View>
            )}

            {/* 2. Error from the last attempt */}
            {errorMessage && <Text style={styles.error} accessibilityLiveRegion="polite">{errorMessage}</Text>}

            {/* 3. The text box and its send button */}
            <View style={styles.row}>
                <TextInput
                    style={styles.input}
                    value={text}
                    onChangeText={setText}
                    placeholder="Add a comment"
                    placeholderTextColor={colors.inactive}
                    accessibilityLabel={editing ? 'Edit your comment' : 'Add a comment'}
                    multiline
                    maxLength={MAX_COMMENT_LENGTH}
                    editable={!isSaving}
                    autoFocus={!!editing}   // tapping Edit brings the keyboard up straight away
                />
                <Pressable
                    onPress={submit}
                    disabled={!canSubmit}
                    accessibilityRole="button"
                    accessibilityLabel={editing ? 'Save comment' : 'Post comment'}
                    accessibilityState={{disabled: !canSubmit, busy: isSaving}}
                    style={({pressed}) => [styles.send, !canSubmit && styles.sendDisabled, pressed && styles.sendPressed]}
                >
                    {isSaving
                        ? <ActivityIndicator color={colors.buttonIconColor} />
                        : <Ionicons name={editing ? 'checkmark' : 'arrow-up'} size={22} color={colors.buttonIconColor} />}
                </Pressable>
            </View>

            {/* 4. Character count, only near the limit */}
            {text.length >= SHOW_COUNT_FROM && (
                <Text style={styles.count}>{text.length}/{MAX_COMMENT_LENGTH}</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {paddingHorizontal: 16, paddingTop: 8, gap: 6, backgroundColor: '#FFFFFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.tabBarBorder},
    editingRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    editingText: {fontSize: 13, color: theme.colors.inactive},
    link: {fontSize: 14, fontWeight: '600', color: theme.colors.activePressed},
    error: {fontSize: 13, color: theme.colors.danger},
    row: {flexDirection: 'row', alignItems: 'flex-end', gap: 8},
    // Grows with the text up to about five lines, then scrolls inside itself
    input: {flex: 1, minHeight: 40, maxHeight: 120, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, borderRadius: 20, backgroundColor: theme.colors.surfaceMuted, fontSize: 15, color: theme.colors.text},
    send: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.active},
    sendDisabled: {opacity: 0.4},
    sendPressed: {backgroundColor: theme.colors.activePressed},
    count: {alignSelf: 'flex-end', fontSize: 12, color: theme.colors.inactive},
});
