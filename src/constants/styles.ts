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

const {colors} = theme;

export const challengeListStyles = StyleSheet.create({
    fill: {flex: 1, backgroundColor: colors.background},
    searchBar: {
        position: 'absolute', top: 16, left: 16, right: 136, zIndex: 1,
        height: 48, borderRadius: 24, paddingLeft: 14, paddingRight: 4,
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: colors.background,
        borderWidth: 1, borderColor: colors.tabBarBorder,
        shadowColor: '#000000', shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
    },
    searchInput: {flex: 1, minWidth: 0, height: '100%', paddingVertical: 0, fontSize: 16, color: colors.text},
    clearSearch: {width: 40, height: 44, alignItems: 'center', justifyContent: 'center'},
    toggleButton: {
        position: 'absolute', top: 16, right: 16, zIndex: 1,
        width: 48, height: 48, borderRadius: 24,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.background,
        borderWidth: 1, borderColor: colors.tabBarBorder,
        shadowColor: '#000000', shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
    },
    filterButton: {right: 76},
    filterActive: {backgroundColor: colors.text, borderColor: colors.text},
    clearResultsRow: {
        position: 'absolute', top: 80, left: 16, right: 16, zIndex: 1,
        alignItems: 'center',
    },
    clearResultsButton: {
        minHeight: 44, paddingHorizontal: 18, borderRadius: 22,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: colors.background,
        borderWidth: 1, borderColor: colors.tabBarBorder,
        shadowColor: '#000000', shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
    },
    clearResultsText: {fontSize: 15, fontWeight: '600', color: colors.text},
    content: {flexGrow: 1, padding: 16, paddingTop: 80, gap: 12},
    centered: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12},
    message: {fontSize: 15, color: colors.inactive, textAlign: 'center'},
    retry: {minHeight: 44, padding: 12},
    retryText: {fontSize: 16, fontWeight: '600', color: colors.text},
    card: {
        padding: 16, borderWidth: 1, borderColor: colors.tabBarBorder, borderRadius: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    cardBody: {flex: 1, gap: 6},
    title: {fontSize: 18, fontWeight: '700', color: colors.text},
    description: {fontSize: 15, lineHeight: 22, color: colors.inactive},
    pressed: {opacity: 0.6},
});

export const challengeFilterStyles = StyleSheet.create({
    backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)'},
    dismissArea: {position: 'absolute', top: 0, bottom: 0, left: 0, right: 0},
    safe: {flex: 1},
    container: {flexGrow: 1, justifyContent: 'center', padding: 24},
    sheet: {width: '100%', maxWidth: 420, alignSelf: 'center', padding: 20, borderRadius: 24, backgroundColor: colors.background, gap: 10},
    header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8},
    title: {flex: 1, fontSize: 22, fontWeight: '700', color: colors.text},
    close: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
    label: {fontSize: 17, fontWeight: '600', color: colors.text},
    fieldLabel: {fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 6},
    hint: {fontSize: 14, lineHeight: 20, color: colors.inactive},
    input: {minHeight: 48, borderWidth: 1, borderColor: colors.tabBarBorder, borderRadius: 12, padding: 12, fontSize: 16, color: colors.text},
    dateField: {gap: 8},
    dateRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
    dateButton: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10},
    dateText: {flex: 1, fontSize: 16, color: colors.text},
    dateDone: {alignSelf: 'flex-end', minHeight: 44, paddingHorizontal: 16, justifyContent: 'center'},
    error: {fontSize: 14, color: '#B91C1C'},
    actions: {flexDirection: 'row', gap: 12, marginTop: 12},
    reset: {flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.tabBarBorder},
    resetText: {fontSize: 15, fontWeight: '600', color: colors.text},
    apply: {flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.text},
    applyText: {fontSize: 15, fontWeight: '600', color: colors.background},
});

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

    // Popup for the challenge started by long-pressing the map.
    // Sits at the bottom like the info card, but has to lift clear of the keyboard.
    draftSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.tabBarBorder,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        color: colors.text,
    },
    inputMultiline: {
        minHeight: 72,
        textAlignVertical: 'top',
    },

    // Cancel and Create sit side by side under the inputs
    cardButtons: {flexDirection: 'row', gap: 10},
    buttonInRow: {flex: 1},
    buttonSecondary: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.tabBarBorder,
    },
    buttonTextSecondary: {color: colors.text, fontWeight: '600'},
    buttonDisabled: {opacity: 0.4},
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


export const createChallengeStyles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.background,
    },

    // Top bar: title, step counter and progress bar
    header: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 12,
        gap: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
    },
    stepLabel: {
        fontSize: 14,
        color: colors.inactive,
    },
    progressTrack: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 8,
    },
    progressSegment: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.tabBarBorder,
    },
    progressSegmentDone: {
        backgroundColor: colors.active,
    },

    // Middle section that changes with each step
    body: {
        flex: 1,
    },
    formContent: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.tabBarBorder,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.text,
    },
    inputMultiline: {
        minHeight: 120,
        textAlignVertical: 'top',
    },
    hint: {
        fontSize: 13,
        color: colors.inactive,
    },


    // Step 2: map with a pin locked to the centre
    mapWrapper: {
        flex: 1,
    },
    pinCentered: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -20,
        marginTop: -40,         // lifts the icon so its tip (not its middle) sits on the map's centre
    },
    coordinateBadge: {
        position: 'absolute',
        bottom: 16,
        alignSelf: 'center',
        backgroundColor: colors.background,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.tabBarBorder,
    },
    coordinateBadgeText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },
    radiusPanel: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 8,
    },

    // Step 3: review
    reviewValue: {
        fontSize: 16,
        color: colors.text,
    },
    reviewMap: {
        height: 180,
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 4,
    },

    // Bottom buttons
    footer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: colors.tabBarBorder,
        backgroundColor: colors.background,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: colors.active,
    },
    buttonSecondary: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.tabBarBorder,
    },
    buttonDisabled: {
        opacity: 0.4,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    buttonTextSecondary: {
        color: colors.text,
    },
})

export const authStyles = StyleSheet.create({
    content: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        gap: 8,
    },
    title: {fontSize: 28, fontWeight: '700', color: colors.text},
    subtitle: {fontSize: 15, color: colors.inactive, marginBottom: 8},
    label: {fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 8},
    input: {
        borderWidth: 1,
        borderColor: colors.tabBarBorder,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.text,
    },
    error: {color: '#B91C1C', fontSize: 14, marginTop: 8},
    notice: {color: colors.text, fontSize: 14, marginTop: 8},
    button: {
        marginTop: 16,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: colors.active,
    },
    buttonText: {color: '#FFFFFF', fontWeight: '600', fontSize: 16},
    switchText: {color: colors.active, fontWeight: '600', textAlign: 'center', marginTop: 16},
    accountName: {fontSize: 24, fontWeight: '700', color: colors.text},
    accountEmail: {fontSize: 15, color: colors.inactive},
    secondaryButton: {
        marginTop: 24,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.tabBarBorder,
    },
    secondaryButtonText: {color: colors.text, fontWeight: '600', fontSize: 16},
})


export const challengeDetailStyles = StyleSheet.create({
    safe: {flex: 1, backgroundColor: colors.background},

    // Back button row across the top
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.tabBarBorder,
    },

    // The challenge itself
    body: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        gap: 12,
    },
    title: {fontSize: 26, fontWeight: '700', color: colors.text},
    description: {fontSize: 16, color: colors.text},

    // Spinner / messages sit in the middle of the screen
    centered: {flex: 1, textAlign: 'center', textAlignVertical: 'center', marginTop: 40},
    message: {fontSize: 15, color: colors.inactive, paddingHorizontal: 32},
})

export const userLocationMarkerStyles = {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.userLocationColor,
    borderWidth: 3,
    borderColor: colors.background,

    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 1},
    elevation: 4,
}
