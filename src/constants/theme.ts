// THEME Section
/*
* Global styling adjustments (colour scheme, spacing, dimensions etc) happen here
* Same applies for key settings for navigating the app
* */

export const theme = {
    swipeEnabled: true,         // users can swipe between sections

    // TODO: Come up with colour scheme; adjust these colours based on theme. All colours are placeholders currently
    // GLOBAL styling colours
    colors: {
        background: '#FFFFFF',
        active: '#FF5A36',
        inactive: '#9AA0A6',
        text: '#111827',

        tabBar: '#FFFFFF',
        tabBarBorder: '#E5E7EB',
    },

    // Styling for TabBar (bottom menu with key sections)
    tabBar: {
        showLabels: true,
        height: 90,
        iconSize: 24,
        labelSize: 11,
        indicatorHeight: 3,
    }
};