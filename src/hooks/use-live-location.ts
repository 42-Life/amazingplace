// LIVE LOCATION
// Tracks the phone's location while a camera is open, so a photo or video gets its location instantly.
// Shared by the photo camera and the video camera.

import {useCallback, useEffect, useRef} from 'react';
import * as Location from 'expo-location';
import {LocationAccuracy} from 'expo-location';
import type {PhotoLocation} from '@/constants/types';

// Returns a function that gives where the user is right now:
// the latest tracked reading, or a fresh one if none has arrived yet (null if unknown).
export function useLiveLocation(): () => Promise<PhotoLocation | null> {
    // Latest GPS reading while the camera is open
    const latestLocation = useRef<PhotoLocation | null>(null);

    // TRACK LOCATION WHILE THE CAMERA IS OPEN
    useEffect(() => {
        let isMounted = true;
        let subscription: Location.LocationSubscription | null = null;

        (async () => {
            try {
                // STEP 1: Ask for location permission (no prompt if already granted)
                const {status} = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted' || !isMounted) return;

                // STEP 2: Keep the latest reading. High = about 10 m accuracy
                const sub = await Location.watchPositionAsync(
                    {accuracy: LocationAccuracy.High, distanceInterval: 5},
                    (position) => {
                        latestLocation.current = {latitude: position.coords.latitude, longitude: position.coords.longitude};
                    }
                );
                if (isMounted) subscription = sub;
                else sub.remove();      // camera closed while we were starting up
            } catch (err) {
                console.error("Could not track location for the camera: ", err);
            }
        })();

        // STEP 3: Stop tracking when the camera closes
        return () => {
            isMounted = false;
            subscription?.remove();
        };
    }, []);

    // Where the user is right now: the latest tracked reading, or a fresh one if none has arrived yet
    return useCallback(async (): Promise<PhotoLocation | null> => {
        if (latestLocation.current) return latestLocation.current;
        try {
            const {status} = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') return null;
            const position = await Location.getCurrentPositionAsync({accuracy: LocationAccuracy.High});
            return {latitude: position.coords.latitude, longitude: position.coords.longitude};
        } catch (err) {
            console.error("Could not get the current location: ", err);
            return null;
        }
    }, []);
}
