// CHALLENGE STATS
// Everything the stats page shows for one of the signed-in user's own challenges:
// totals, the 3 most-voted submissions, and submissions over time.
// No new tables: it's all worked out from the challenge, its submissions and its votes.

// KEY IMPORTS
import type { ChallengeLocation } from '@/constants/types';
import { fetchCreatedChallengeById } from '@/lib/challenges';
import { fetchSubmissionStatsRows, type SubmissionStatsRow } from '@/lib/photos';
import { fetchChallengeVotes } from '@/lib/voting';
import { bucketByTime, rankSubmissions, type Timeline } from '@/utils/challenge-stats';


export type TopSubmission = SubmissionStatsRow & {votes: number};

export type ChallengeStats = {
    challenge: ChallengeLocation
    totals: {
        submissions: number
        votes: number
        participants: number   // different accounts that submitted
    }
    topSubmissions: TopSubmission[]   // at most 3, best first; empty if nobody has voted
    timeline: Timeline
};


// FETCH CHALLENGE STATS
// Only works for the signed-in user's own challenges, ended ones included
// (fetchCreatedChallengeById throws a readable error for anything else).
export async function fetchChallengeStats(challengeId: string): Promise<ChallengeStats> {
    // STEP 1: Load the three things at once
    const [challenge, submissions, votes] = await Promise.all([
        fetchCreatedChallengeById(challengeId),
        fetchSubmissionStatsRows(challengeId),
        fetchChallengeVotes(challengeId),
    ]);

    // STEP 2: Work out the numbers
    return {
        challenge,
        totals: {
            submissions: submissions.length,
            votes: votes.total,
            participants: new Set(submissions.map((row) => row.accountId)).size,
        },
        topSubmissions: rankSubmissions(submissions, votes.counts, 3),
        timeline: bucketByTime(submissions.map((row) => row.createdAt), challenge.start_at, challenge.end_at),
    };
}
