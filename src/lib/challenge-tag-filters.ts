import type {ChallengeLocation, ChallengeTagId} from '@/constants/types';

/**
 * Match ANY selected tag. No selected tags means no category restriction.
 * This same helper should be used for both the challenge list and map markers.
 */
export function filterChallengesByTags(
    challenges: ChallengeLocation[],
    selectedTags: readonly ChallengeTagId[],
): ChallengeLocation[] {
    if (selectedTags.length === 0) return challenges;
    const selected = new Set(selectedTags);
    return challenges.filter((challenge) =>
        (challenge.tags ?? []).some((tag) => selected.has(tag as ChallengeTagId)),
    );
}
