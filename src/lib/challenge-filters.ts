import type { ChallengeLocation, MediaType } from '@/constants/types';
import { filterChallengesByStartDate, type ChallengeStartDateFilter } from '@/lib/filter';

export type MediaTypeFilter = 'any' | MediaType;

export type ChallengeFilters = ChallengeStartDateFilter & {
    mediaType: MediaTypeFilter;
    maxDistanceMiles: number | null;   // null = no distance limit
    // later: tags: string[]
};

export const NO_FILTERS: ChallengeFilters = {
    from: '',
    through: '',
    mediaType: 'any',
    maxDistanceMiles: null,
};

export const DISTANCE_OPTIONS_MILES = [1, 5, 10, 25];

const METERS_PER_MILE = 1609.344;

type Point = { latitude: number; longitude: number };

// Haversine distance. If you'd rather use your utils/distance.ts, swap it in here.
export function distanceMeters(a: Point, b: Point): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

// Number of filter groups in use (the date range counts as one)
export function countActiveFilters(f: ChallengeFilters): number {
    return (
        (f.from || f.through ? 1 : 0) +
        (f.mediaType !== 'any' ? 1 : 0) +
        (f.maxDistanceMiles !== null ? 1 : 0)
    );
}

export function applyChallengeFilters(
    challenges: ChallengeLocation[],
    filters: ChallengeFilters,
    userCoordinate: Point | null,
): ChallengeLocation[] {
    let result = filterChallengesByStartDate(challenges, filters);

    if (filters.mediaType !== 'any') {
        // A future 'both' challenge matches either choice
        result = result.filter(
            (c) => (c.media_type as string) === 'both' || c.media_type === filters.mediaType,
        );
    }

    // Skipped if we don't know where the user is (the modal disables the option in that case)
    if (filters.maxDistanceMiles !== null && userCoordinate) {
        const maxMeters = filters.maxDistanceMiles * METERS_PER_MILE;
        result = result
            .map((c) => ({ c, d: distanceMeters(userCoordinate, { latitude: Number(c.latitude), longitude: Number(c.longitude) }) }))
            .filter(({ d }) => d <= maxMeters)
            .sort((x, y) => x.d - y.d)      // nearest first
            .map(({ c }) => c);
    }

    return result;
}