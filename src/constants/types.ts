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

// One challenge pin: where it is and what people are asked to photograph
export type ChallengeLocation = {
    id: string
    title: string
    description: string
    latitude: number
    longitude: number
}
