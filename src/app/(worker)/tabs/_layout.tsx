import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../theme";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { withLayoutContext } from 'expo-router';

const { Navigator } = createBottomTabNavigator();

export const BottomTabs = withLayoutContext(Navigator);

const WorkerTabsLayout = () => {
  // 📱 Mobile → Tabs
  return (
    <BottomTabs
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        headerShown: false, // The header is shown in the parent stack navigator
        tabBarActiveTintColor: theme.colors.primary,
        tabBarStyle: {
          backgroundColor: theme.colors.pageBackground,
          borderTopColor: theme.colors.borderColor,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <BottomTabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
      <BottomTabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <BottomTabs.Screen
        name="projects"
        options={{
          title: "Projects",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="briefcase-outline" color={color} size={size} />
          ),
        }}
      />
      <BottomTabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="bar-chart-outline" color={color} size={size} />
          ),
        }}
      />
    </BottomTabs>
  );
};

export default WorkerTabsLayout;
