// KEY IMPORTS
import { TABS } from '@/constants/types'    // list of tabs
import {Tabs} from 'expo-router';
import {theme} from "@/constants/theme";
import {Ionicons} from '@expo/vector-icons';

// MAIN FUNCTION
export default function TabsLayout() {
    const {colors, tabBar} = theme;

    return(
        <Tabs
        screenOptions={{
            headerShown: false, // no header bar displaying the title of the page; modern and minimal
            tabBarActiveTintColor: colors.active,       // custom color for active label, based on preset theme/colour scheme
            tabBarInactiveTintColor: colors.inactive,
            tabBarStyle: {
                backgroundColor: colors.background,
                borderTopColor: colors.tabBarBorder,    // border separating bottom tab bar from main content
            },
        }}
        >
            {TABS.map((tab) => (
                <Tabs.Screen
                    key={tab.name}
                    name={tab.name}
                    options={{
                        title: tab.title,
                        tabBarIcon: ({color, focused}) => (
                            <Ionicons
                                name={focused ? tab.iconFocused : tab.icon}
                                size={tabBar.iconSize}
                                color={focused ? colors.active : colors.inactive}
                            />
                        )
                    }}
                />
            ))}
        </Tabs>
    )
}