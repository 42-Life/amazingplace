// LOCATION HELPERS
// Finding where the user is, and how far apart two points on the map are.
// Used by the Challenges list (nearest first) and reusable for map geofencing.

// KEY IMPORTS
import * as Location from 'expo-location';


// COORDINATES TYPE
// A point on the map, in degrees
export type Coordinates = {
    latitude: number
    longitude: number
}


// GET DISTANCE IN MILES
// Works out the straight-line distance between two points on the Earth (the haversine formula).
export function getDistanceInMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // STEP 1: The Earth's radius, in miles
    const earthRadius = 3958.8;

    // STEP 2: Convert the differences in latitude and longitude from degrees to radians
    const latDiff = toRadians(lat2 - lat1);
    const lonDiff = toRadians(lon2 - lon1);

    // STEP 3: Apply the haversine formula to get the angle between the two points
    const a = Math.sin(latDiff / 2) * Math.sin(latDiff / 2)
        + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
        * Math.sin(lonDiff / 2) * Math.sin(lonDiff / 2);
    const angle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // STEP 4: Turn that angle into a distance along the Earth's surface
    return earthRadius * angle;
}


// TO RADIANS
// Converts an angle from degrees to radians (the trig functions above need radians)
function toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
}


// GET USER LOCATION
// Asks for permission and returns where the user is right now.
// Returns null if the user says no or the phone can't find a position (e.g. location services
// are switched off), so callers can carry on without a location.
export async function getUserLocation(): Promise<Coordinates | null> {
    try {
        // STEP 1: Ask the user for permission to use their location while the app is open
        const permission = await Location.requestForegroundPermissionsAsync();

        // STEP 2: Stop here if they said no
        if (permission.status !== 'granted') return null;

        // STEP 3: Get their current position (Balanced is accurate to about 100 m, which is plenty here)
        const position = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});

        // STEP 4: Return just the latitude and longitude
        return {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
        };
    } catch (err) {
        // Log for developers, then carry on as if permission was refused
        console.warn('Could not get user location:', err);
        return null;
    }
}
