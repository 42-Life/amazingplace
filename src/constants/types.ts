// Necessary import for Icons
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'

// wrapper for Icon type
type IconName = ComponentProps<typeof Ionicons>['name']

// Type for Bottom tab with icons for each section of the app
type TabConfig =  {
    name: string;           // needs to match EXACTLY with filename in src/app/(tabs)
    title: string;
    icon: IconName;         // Icon shown when unselected
    iconFocused: IconName;  // Icon shown when selected (ie we are on this page)
}

// These are the icons used for the bottom menu bar for the different app sections.
// If adding or removing a main section for the app, use this
export const TABS: TabConfig[] = [
    {name: 'explore', title: 'Explore', icon: 'map-outline', iconFocused: 'map'},               // Map/Explore section
    {name: 'index', title: 'Capture', icon: 'camera-outline', iconFocused: 'camera'},           // Photo Capture/Upload section
    {name: 'challenges', title: 'Challenges', icon: 'trophy-outline', iconFocused: 'trophy'},   // Challenge List & Leaderboard section
    {name: 'account', title: 'Account', icon: 'person-outline', iconFocused: 'person'},         // Account/Settings section
]

//
export type ChallengeLocation = {
    id: string
    title: string
    description: string
    latitude: number
    longitude: number
}

// FALLBACK challenge list. The real list lives in the Supabase "challenges" table and is loaded by the Explore screen.
// These are only shown if the database can't be reached (e.g. no internet), so the map is never empty.
export const LOCATIONS: ChallengeLocation[] = [
    {
        id: 'bu-cas-building',
        title: 'BU College of Arts and Sciences Photo Challenge',
        description: "The first challenge begins here...",
        latitude: 42.350294,
        longitude: -71.105765,
    },

    {
        id: 'bu-cds-building',
        title: 'BU College of Computing and Data Sciences Photo Challenge',
        description: "Another challenge may be found here",
        latitude: 42.350188,
        longitude: -71.103158,
    },

    {
        id: 'MIT',
        title: 'MIT Photo Challenge',
        description: 'MIT is inviting you to take the best MIT campus photo',
        latitude: 42.360012,
        longitude: -71.093995,
    }
]