// VOTING
// Casting and changing a vote. Each account gets one vote per challenge (enforced by the votes table),
// and nobody can vote for their own submission (enforced by the prevent_self_vote trigger).

// KEY IMPORTS
import { supabase } from '@/lib/supabase';
import { fetchMyAccount } from '@/lib/accounts';
import { fetchAllRows } from '@/lib/fetch-all-rows';
import type { Vote } from '@/constants/types';


// The columns every vote query asks for
const VOTE_FIELDS = 'id, account_id, submission_id, challenge_id, created_at';


// CHALLENGE VOTES
// Every vote in one challenge, boiled down to what the challenge screen shows.
export type ChallengeVotes = {
    counts: Record<string, number>   // submission id -> how many votes it has
    total: number                    // all votes in the challenge
    mySubmissionId: string | null    // which submission the signed-in user voted for, if any
}

// FETCH CHALLENGE VOTES
export async function fetchChallengeVotes(challengeId: string): Promise<ChallengeVotes> {
    const account = await fetchMyAccount();
    // Every vote, not just the first 1000 (see fetch-all-rows.ts). Ordered by id so the pages don't overlap.
    const data = await fetchAllRows<{account_id: string; submission_id: string}>((from, to) => supabase
        .from('votes')
        .select('account_id, submission_id')
        .eq('challenge_id', challengeId)
        .order('id')
        .range(from, to));

    const counts: Record<string, number> = {};
    let mySubmissionId: string | null = null;
    for (const vote of data) {
        counts[vote.submission_id] = (counts[vote.submission_id] ?? 0) + 1;
        if (vote.account_id === account?.id) mySubmissionId = vote.submission_id;
    }
    return {counts, total: data.length, mySubmissionId};
}


// SUBMIT VOTE
// Casts the signed-in user's vote for a submission. Fails if they already voted in this challenge.
export async function submitVote(challengeId: string, submissionId: string): Promise<Vote> {
    // STEP 1: Make sure the user is signed in
    const account = await fetchMyAccount();
    if (!account) throw new Error('Please sign in first.');

    // STEP 2: Save the vote and ask the database to send the saved row back
    const {data, error} = await supabase
        .from('votes')
        .insert({account_id: account.id, challenge_id: challengeId, submission_id: submissionId})
        .select(VOTE_FIELDS)
        .single();

    // STEP 3: Turn known database errors into readable ones
    //   23505 = unique rule broken (already voted in this challenge)
    //   23503 = foreign key broken (submission doesn't exist or isn't in this challenge)
    if (error?.code === '23505') throw new Error('You already voted in this challenge.');
    if (error?.code === '23503') throw new Error('That submission is no longer in this challenge.');
    if (error) throw error;
    return data as Vote;
}


// UPDATE VOTE
// Moves the signed-in user's existing vote in a challenge to a different submission.
export async function updateVote(challengeId: string, submissionId: string): Promise<Vote> {
    // STEP 1: Make sure the user is signed in
    const account = await fetchMyAccount();
    if (!account) throw new Error('Please sign in first.');

    // STEP 2: Point their vote for this challenge at the new submission
    const {data, error} = await supabase
        .from('votes')
        .update({submission_id: submissionId})
        .eq('account_id', account.id)
        .eq('challenge_id', challengeId)
        .select(VOTE_FIELDS)
        .maybeSingle();

    // STEP 3: Turn known database errors into readable ones
    if (error?.code === '23503') throw new Error('That submission is no longer in this challenge.');
    if (error) throw error;
    if (!data) throw new Error('You haven’t voted in this challenge yet.');
    return data as Vote;
}


// REMOVE VOTE
// Takes back the signed-in user's vote in a challenge.
export async function removeVote(challengeId: string): Promise<void> {
    // STEP 1: Make sure the user is signed in
    const account = await fetchMyAccount();
    if (!account) throw new Error('Please sign in first.');

    // STEP 2: Delete their vote for this challenge
    const {error} = await supabase
        .from('votes')
        .delete()
        .eq('account_id', account.id)
        .eq('challenge_id', challengeId);
    if (error) throw error;
}
