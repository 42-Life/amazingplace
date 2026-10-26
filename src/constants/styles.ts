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