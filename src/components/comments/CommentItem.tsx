// COMMENT ITEM
// One comment in the list under a submission: who wrote it, when, and what they said.
// The writer's own comments also get Edit and Delete buttons.
// This component only asks; the submission page does the actual editing and deleting.

import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {theme} from '@/constants/theme';
import type {Comment} from '@/constants/types';

type Props = {
    comment: Comment;
    isEditing?: boolean;    // this comment is the one open in the composer, so highlight it
    isDeleting?: boolean;   // its delete is on its way to the database
    onEdit: (comment: Comment) => void;
    onDelete: (comment: Comment) => void;
};

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});

export default function CommentItem({comment, isEditing, isDeleting, onEdit, onDelete}: Props) {
    const {colors} = theme;

    return (
        <View style={[styles.comment, isEditing && styles.editing, isDeleting && styles.deleting]}>
            <View style={styles.top}>
                <Text style={styles.username} numberOfLines={1}>@{comment.username}</Text>
                <Text style={styles.date}>{formatDate(comment.createdAt)}{comment.editedAt ? ' · edited' : ''}</Text>

                {/* Edit and Delete: only on the signed-in user's own comments */}
                {comment.isOwn && (
                    <View style={styles.actions}>
                        {isDeleting ? (
                            <ActivityIndicator color={colors.inactive} accessibilityLabel="Deleting comment" />
                        ) : (
                            <>
                                <Pressable
                                    onPress={() => onEdit(comment)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Edit comment"
                                    hitSlop={10}
                                    style={({pressed}) => pressed && styles.pressed}
                                >
                                    <Ionicons name="pencil-outline" size={18} color={colors.inactive} />
                                </Pressable>
                                <Pressable
                                    onPress={() => onDelete(comment)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Delete comment"
                                    hitSlop={10}
                                    style={({pressed}) => pressed && styles.pressed}
                                >
                                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                                </Pressable>
                            </>
                        )}
                    </View>
                )}
            </View>
            <Text style={styles.body}>{comment.body}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    comment: {paddingHorizontal: 20, paddingVertical: 12, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.tabBarBorder},
    editing: {backgroundColor: theme.colors.surfaceMuted},
    deleting: {opacity: 0.5},
    top: {flexDirection: 'row', alignItems: 'center', gap: 8},
    username: {flexShrink: 1, fontSize: 15, fontWeight: '700', color: theme.colors.text},
    date: {fontSize: 13, color: theme.colors.inactive},
    // marginLeft: 'auto' pushes the buttons to the right edge of the row
    actions: {marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 20, minHeight: 24},
    pressed: {opacity: 0.5},
    body: {fontSize: 15, lineHeight: 21, color: theme.colors.text},
});
