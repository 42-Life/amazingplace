// COMMENTS
// Writing, editing, deleting and loading the comments under a submission.
// A user can leave as many comments as they like; they can only edit or delete their own
// (enforced by the comments table's row level security).

// KEY IMPORTS
import { supabase } from '@/lib/supabase';
import { fetchMyAccount } from '@/lib/accounts';
import type { Comment } from '@/constants/types';


// Longest comment the database accepts (see comments_body_check in supabase/schema/comments.sql)
export const MAX_COMMENT_LENGTH = 500;

// The columns every comment query asks for, including the author's username (joined through account_id)
const COMMENT_FIELDS = 'id, account_id, submission_id, body, created_at, edited_at, accounts(username)';

// A comment row as the database sends it back
type CommentRow = {
    id: string
    account_id: string
    submission_id: string
    body: string
    created_at: string
    edited_at: string | null
    accounts: {username: string} | null
};

// Turns a database row into something the app can display
const toComment = (row: CommentRow, myAccountId: string | undefined): Comment => ({
    id: row.id,
    accountId: row.account_id,
    submissionId: row.submission_id,
    body: row.body,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    username: row.accounts?.username ?? 'unknown',
    isOwn: row.account_id === myAccountId,
});

// CLEAN COMMENT TEXT
// Trims the text and checks its length before anything is sent, so the user gets a
// readable message instead of a database error. The database checks the same rule.
function cleanBody(body: string): string {
    const text = body.trim();
    if (text.length === 0) throw new Error('Write something before posting.');
    if (text.length > MAX_COMMENT_LENGTH) throw new Error(`Comments can be up to ${MAX_COMMENT_LENGTH} characters.`);
    return text;
}


// FETCH COMMENTS
// Every comment under one submission, oldest first.
export async function fetchComments(submissionId: string): Promise<Comment[]> {
    const account = await fetchMyAccount();
    const {data, error} = await supabase
        .from('comments')
        .select(COMMENT_FIELDS)
        .eq('submission_id', submissionId)
        .order('created_at', {ascending: true})
        .overrideTypes<CommentRow[], {merge: false}>();
    if (error) throw error;
    return (data ?? []).map((row) => toComment(row, account?.id));
}


// FETCH A PAGE OF COMMENTS
// The next `limit` comments under a submission, oldest first, skipping the first `offset`.
// Used by the submission page, which loads more as the user scrolls down.
//   Fewer rows back than `limit` means there are no more to load.
//   Oldest first keeps the paging steady: new comments land at the end, not in the middle.
export async function fetchCommentsPage(submissionId: string, offset: number, limit = 20): Promise<Comment[]> {
    const account = await fetchMyAccount();
    const {data, error} = await supabase
        .from('comments')
        .select(COMMENT_FIELDS)
        .eq('submission_id', submissionId)
        .order('created_at', {ascending: true})
        .order('id', {ascending: true})   // tie-breaker, so two comments in the same instant keep one order
        .range(offset, offset + limit - 1)
        .overrideTypes<CommentRow[], {merge: false}>();
    if (error) throw error;
    return (data ?? []).map((row) => toComment(row, account?.id));
}


// CREATE COMMENT
// Posts a comment under a submission as the signed-in user.
export async function createComment(submissionId: string, body: string): Promise<Comment> {
    // STEP 1: Make sure the user is signed in and the text is usable
    const account = await fetchMyAccount();
    if (!account) throw new Error('Please sign in first.');
    const text = cleanBody(body);

    // STEP 2: Save the comment and ask the database to send the saved row back
    const {data, error} = await supabase
        .from('comments')
        .insert({account_id: account.id, submission_id: submissionId, body: text})
        .select(COMMENT_FIELDS)
        .single()
        .overrideTypes<CommentRow, {merge: false}>();

    // STEP 3: Turn known database errors into readable ones
    //   23503 = foreign key broken (the submission was deleted)
    if (error?.code === '23503') throw new Error('That submission no longer exists.');
    if (error) throw error;
    return toComment(data, account.id);
}


// UPDATE COMMENT
// Changes the text of one of the signed-in user's own comments.
// The database stamps edited_at itself, so the returned comment carries the new time.
export async function updateComment(commentId: string, body: string): Promise<Comment> {
    // STEP 1: Make sure the user is signed in and the text is usable
    const account = await fetchMyAccount();
    if (!account) throw new Error('Please sign in first.');
    const text = cleanBody(body);

    // STEP 2: Save the new text
    const {data, error} = await supabase
        .from('comments')
        .update({body: text})
        .eq('id', commentId)
        .select(COMMENT_FIELDS)
        .maybeSingle()
        .overrideTypes<CommentRow, {merge: false}>();
    if (error) throw error;

    // STEP 3: No row back means nothing was changed: the comment is gone or belongs to someone else
    if (!data) throw new Error('That comment no longer exists or isn’t yours to edit.');
    return toComment(data, account.id);
}


// DELETE COMMENT
// Removes one of the signed-in user's own comments.
export async function deleteComment(commentId: string): Promise<void> {
    // STEP 1: Make sure the user is signed in
    const account = await fetchMyAccount();
    if (!account) throw new Error('Please sign in first.');

    // STEP 2: Delete it, asking for the deleted row back so we can tell whether anything happened
    //   (deleting someone else's comment isn't an error to the database; it just removes nothing)
    const {data, error} = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('That comment no longer exists or isn’t yours to delete.');
}
