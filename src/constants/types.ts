// Necessary import for Icons
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import {type StyleProp, type ViewStyle} from "react-native";

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
    {name: 'joined', title: 'Joined', icon: 'trophy-outline', iconFocused: 'trophy'},           // Challenges the user has entered
    {name: 'challenges', title: 'Create', icon: 'add-circle-outline', iconFocused: 'add-circle'}, // Create and manage challenges
    {name: 'account', title: 'Account', icon: 'person-outline', iconFocused: 'person'},         // Account/Settings section
]

// What a challenge asks people to capture. Set when the challenge is created and can't change after.
export type MediaType = 'photo' | 'video'

// One challenge pin: where it is and what people are asked to photograph or film
export type ChallengeLocation = {
    id: string
    title: string
    description: string
    latitude: number
    longitude: number
    start_at: string
    end_at: string          // last day of the challenge, YYYY-MM-DD
    radius_m: number        // photos and videos must be taken within this many meters of the pin
    media_type: MediaType   // whether entries are photos or videos
    tags: ChallengeTagId[]
    price_cents: number     // entry fee in cents (0 = free). Stored in cents so no rounding can lose a penny
}

// Where a photo or video was taken
export type PhotoLocation = {
    latitude: number
    longitude: number
}

// for buttons used in photo screen
export type PhotoButtonProps = {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;                          // accessibility label
    onPress: () => void;
    corner?: 'left' | 'right';
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
};

// for buttons containing text to be used in photo screen
export type TextButtonProps = {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
};

export type Account = {
    id: string
    username: string
    email: string
}

// One account's vote in a challenge (each account gets one vote per challenge)
export type Vote = {
    id: string
    account_id: string
    submission_id: string
    challenge_id: string
    created_at: string
}

// One comment under a submission, ready to display
export type Comment = {
    id: string
    accountId: string
    submissionId: string
    body: string
    createdAt: string
    editedAt: string | null   // null if the text was never changed
    username: string          // who wrote it
    isOwn: boolean            // written by the signed-in user, so they may edit or delete it
}

// Challenge Tags
export type ChallengeTagId =
    | 'pranks_humor'
    | 'dares_skits'
    | 'everyday_life'
    | 'nature_scenery'
    | 'art_music'
    | 'sports_fitness'
    | 'photography'
    | 'food_drink'
    | 'animals_pets'
    | 'scavenger_hunt'
    | 'community_kindness'
    | 'other';

export type ChallengeTagProps = {
    tags: readonly string[] | null | undefined;
};

export type ChallengeTagDefinition = {
    id: ChallengeTagId;
    label: string;
    icon: ComponentProps<typeof Ionicons>['name'];
    color: string;
    // Option C: very subtle category tint mixed into a neutral grey pill.
    backgroundColor: string;
    // Option A: stronger category-specific tinted background.
    optionABackgroundColor: string;
};

export type ChallengeTagPickerProps = {
    value: ChallengeTagId[];
    onChange: (next: ChallengeTagId[]) => void;
    disabled?: boolean;
};