import { StyleSheet } from "react-native"
import {theme} from "@/constants/theme";

export const screenShellStyles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    container: {
        flex: 1,
        alignItems: "center", justifyContent: "center",
    },
    title: {
        fontSize: 24, fontWeight: '700',
        color: theme.colors.text,
    },
})

const {colors, tabBar} = theme;

export const swipeTabsStyles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        borderTopWidth: 1,
        backgroundColor: colors.tabBarBorder,
        borderTopColor: colors.tabBarBorder,
    },

    tab: {
        flex: 1,
        gap: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },

    tabTitle: {
        fontSize: tabBar.labelSize,
        fontWeight: '600',
    }
})

export const tabBarAreaStyles = (bottomInset: number) => ({
    height: tabBar.height,
    paddingBottom: bottomInset,
})

export const challengeMapMarkersStyles = StyleSheet.create({
    dot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },

    dotSelected: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },

    card: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 16,
        padding: 16,
        borderRadius: 16,
        gap: 6, // space between the card's children
    },
    cardTitle: {fontSize: 18, fontWeight: '700'},
    cardBody: {fontSize: 14},

    button: {
        marginTop: 8,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: {color: '#FFFFFF', fontWeight: '600'},
})

export const photoCaptureStyles = StyleSheet.create({
    fill: {flex: 1, backgroundColor: '#000000'},
    center: {alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16},
    message: {color: '#FFFFFF', fontSize: 16, textAlign: 'center'},

    // Row of three controls along the bottom, evenly spaced.
    controls: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },

    // Semi-transparent circle behind small icon buttons so they read on any image.
    roundButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    shutterRing: {
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 4,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    shutterCenter: {width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF'},

    previewButtons: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 24,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    textButton: {paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24},
    secondary: {backgroundColor: 'rgba(0,0,0,0.55)'},
    textButtonLabel: {color: '#FFFFFF', fontWeight: '600', fontSize: 16},

    // Sheet that slides up from the bottom to choose which challenge to submit to
    chooserSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: '60%',
        padding: 20,
        paddingBottom: 32,
        gap: 10,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        backgroundColor: theme.colors.background,
    },
    chooserTitle: {fontSize: 18, fontWeight: '700', color: theme.colors.text},
    chooserItem: {
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.tabBarBorder,
        marginBottom: 8,
    },
    chooserItemTitle: {fontSize: 15, fontWeight: '600', color: theme.colors.text},
    chooserMessage: {fontSize: 14, color: theme.colors.inactive},
    chooserCancel: {alignItems: 'center', paddingVertical: 10},
    chooserCancelText: {fontSize: 15, fontWeight: '600', color: theme.colors.inactive},

    // Dark overlay with a spinner shown while a photo is uploading
    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
});
export const galleryStyles = StyleSheet.create({
    safe: {flex: 1, backgroundColor: colors.background},

    // Title row across the top
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.tabBarBorder,
    },
    title: {fontSize: 22, fontWeight: '700', color: colors.text},

    // Spinner / messages sit in the middle of the screen
    centered: {flex: 1, textAlign: 'center', textAlignVertical: 'center', marginTop: 40},
    message: {fontSize: 15, color: colors.inactive, paddingHorizontal: 32},

    // Two-column photo grid
    grid: {padding: 12, gap: 12},
    row: {gap: 12},
    tile: {flex: 1, gap: 6},
    image: {width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: colors.tabBarBorder},
    caption: {fontSize: 13, fontWeight: '600', color: colors.text},
})
