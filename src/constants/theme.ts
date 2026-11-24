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

    },

    // Styling for TabBar (bottom menu with key sections)
    tabBar: {
        iconSize: 24,
    }
};

// frosted blue: 9ad1d4