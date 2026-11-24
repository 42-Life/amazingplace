// THEME Section
/*
* Global styling adjustments (colour scheme, spacing, dimensions etc) happen here
* Same applies for key settings for navigating the app
* */

export const theme = {
    // TODO: Come up with colour scheme; adjust these colours based on theme. All colours are placeholders currently
    // GLOBAL styling colours
    colors: {
        // Primary
        active: '#EA580C',
        activePressed: '#C2410C',     // pressed state, and orange text on white
        activeLight: '#DF7237',
        activeSoft: '#DF7237',        // light orange tint: highlighted rows, badges

        // Secondary
        // #116175 or #3066be ?
        secondary: '#116175',
        secondaryPressed: '#115E59',
        secondarySoft: '#CCFBF1',     // selected chip background, soft tags

        // Neutrals
        background: '#FCFFFC',
        whiteText: '#FFFFFF',
        inactive: '#6B7280',    // ~4.8:1 on white. The old #9AA0A6 was ~2.6:1, under the 4.5:1 minimum
        text: '#111827',
        surfaceMuted: '#F3F4F6',
        tabBarBorder: '#E5E7EB',
        shadow: '#000000',

        // Icons
        buttonIconColor: '#FFFFFF',
        userLocationColor: '#2F80ED',
        challengeMarker: '#DF7237', // lighter than active orange

        // Meaning
        success: '#15803D',  successSoft: '#DCFCE7',   // live, submitted, approved
        warning: '#B45309',  warningSoft: '#FEF3C7',   // ending soon, nearly full
        danger: '#B91C1C',   dangerSoft: '#FEE2E2',    // errors
        record: '#EF4444',                             // camera record button

        // Dark mode
        // darkModeText: '#E5E7EB'
        // darkModeBackground: '#2F2F2F',

        // Challenge Tags
        challengeTags: {
            pranksHumor: {
                color: '#A66A00',
                backgroundColor: '#F5F1E5',
                optionABackgroundColor: '#FFF5BF',
            },
            daresSkits: {
                color: '#C23B83',
                backgroundColor: '#F5EEF2',
                optionABackgroundColor: '#FBE3F0',
            },
            everydayLife: {
                color: '#64748B',
                backgroundColor: '#F0F1F3',
                optionABackgroundColor: '#E2E8F0',
            },
            natureScenery: {
                color: '#16A34A',
                backgroundColor: '#EDF4EF',
                optionABackgroundColor: '#DCFCE7',
            },
            artMusic: {
                color: '#8B5CF6',
                backgroundColor: '#F1EFF6',
                optionABackgroundColor: '#EDE9FE',
            },
            sportsFitness: {
                color: '#3B82F6',
                backgroundColor: '#EDF1F7',
                optionABackgroundColor: '#DBEAFE',
            },
            photography: {
                color: '#06B6D4',
                backgroundColor: '#EDF3F4',
                optionABackgroundColor: '#CFFAFE',
            },
            foodDrink: {
                color: '#F97316',
                backgroundColor: '#F6F0EC',
                optionABackgroundColor: '#FFEDD5',
            },
            animalsPets: {
                color: '#F43F5E',
                backgroundColor: '#F6EFF0',
                optionABackgroundColor: '#FFE4E6',
            },
            scavengerHunt: {
                color: '#84CC16',
                backgroundColor: '#F1F3E9',
                optionABackgroundColor: '#ECFCCB',
            },
            communityKindness: {
                color: '#6366F1',
                backgroundColor: '#F0F0F6',
                optionABackgroundColor: '#E0E7FF',
            },
            other: {
                color: '#64748B',
                backgroundColor: '#F1F2F4',
                optionABackgroundColor: '#E5E7EB',
            },
        },
    },

    // Styling for TabBar (bottom menu with key sections)
    tabBar: {
        iconSize: 24,
    },

    challengePhases: {
        upcoming: '#2563EB',
        entry: '#15803D',
        voting: '#CA8A04',
        closed: '#DC2626',
    }
};

// frosted blue: 9ad1d4