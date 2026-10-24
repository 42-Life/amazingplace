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