// THEME Section
/*
* Global styling adjustments (colour scheme, spacing, dimensions etc) happen here
* Same applies for key settings for navigating the app
* */

export const theme = {
    // TODO: Come up with colour scheme; adjust these colours based on theme. All colours are placeholders currently
    // GLOBAL styling colours
    colors: {
        background: '#FFFFFF',
        active: '#FF5A36',
        inactive: '#6B7280',    // ~4.8:1 on white. The old #9AA0A6 was ~2.6:1, under the 4.5:1 minimum
        text: '#111827',
        tabBarBorder: '#E5E7EB',

        // darkModeText: '#E5E7EB'
        // darkModeBackground: '#2F2F2F',
    },

    // Styling for TabBar (bottom menu with key sections)
    tabBar: {
        iconSize: 24,
    }
};