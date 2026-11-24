import {ChallengeTagDefinition, ChallengeTagId} from "@/constants/types";
import {theme} from "@/constants/theme";

export const CHALLENGE_TAGS: readonly ChallengeTagDefinition[] = [
    {
        id: 'pranks_humor',
        label: 'Pranks & Humor',
        icon: 'happy-outline',
        ...theme.colors.challengeTags.pranksHumor,
    },
    {
        id: 'dares_skits',
        label: 'Dares & Skits',
        icon: 'ticket-outline',
        ...theme.colors.challengeTags.daresSkits,
    },
    {
        id: 'everyday_life',
        label: 'Everyday Life',
        icon: 'cafe-outline',
        ...theme.colors.challengeTags.everydayLife,
    },
    {
        id: 'nature_scenery',
        label: 'Nature & Scenery',
        icon: 'leaf-outline',
        ...theme.colors.challengeTags.natureScenery,
    },
    {
        id: 'art_music',
        label: 'Art & Music',
        icon: 'color-palette-outline',
        ...theme.colors.challengeTags.artMusic,
    },
    {
        id: 'sports_fitness',
        label: 'Sports & Fitness',
        icon: 'walk-outline',
        ...theme.colors.challengeTags.sportsFitness,
    },
    {
        id: 'photography',
        label: 'Photography',
        icon: 'camera-outline',
        ...theme.colors.challengeTags.photography,
    },
    {
        id: 'food_drink',
        label: 'Food & Drink',
        icon: 'restaurant-outline',
        ...theme.colors.challengeTags.foodDrink,
    },
    {
        id: 'animals_pets',
        label: 'Animals & Pets',
        icon: 'paw-outline',
        ...theme.colors.challengeTags.animalsPets,
    },
    {
        id: 'scavenger_hunt',
        label: 'Scavenger Hunt',
        icon: 'compass-outline',
        ...theme.colors.challengeTags.scavengerHunt,
    },
    {
        id: 'community_kindness',
        label: 'Community & Kindness',
        icon: 'heart-outline',
        ...theme.colors.challengeTags.communityKindness,
    },
    {
        id: 'other',
        label: 'Other',
        icon: 'ellipsis-horizontal-circle-outline',
        ...theme.colors.challengeTags.other,
    },
] as const;

export const CHALLENGE_TAG_IDS = CHALLENGE_TAGS.map((tag) => tag.id) as ChallengeTagId[];

export function isChallengeTagId(value: unknown): value is ChallengeTagId {
    return typeof value === 'string' && CHALLENGE_TAG_IDS.includes(value as ChallengeTagId);
}

export function normalizeChallengeTags(tags: unknown): ChallengeTagId[] {
    if (!Array.isArray(tags)) return [];
    return [...new Set(tags.filter(isChallengeTagId))].slice(0, 3);
}

export function getChallengeTag(id: string) {
    return CHALLENGE_TAGS.find((tag) => tag.id === id);
}