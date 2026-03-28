import React, { useEffect } from "react";
import { Redirect, useRouter } from "expo-router";
import { useSession } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { withLayoutContext } from 'expo-router';
import { Text } from "../../components/Themed";
import { SubscriptionLockScreen } from "../../components/SubscriptionLockScreen";
import { Platform } from "react-native";

const { Navigator } = createBottomTabNavigator();
export const BottomTabs = withLayoutContext(Navigator);

function ProtectedWorkerLayout() {
  const { user, isLoading, userRole, isSubscriptionExpired } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user || !userRole) {
      return;
    }
    if (userRole !== 'worker') {
      router.replace('/(manager)/dashboard');
    }
  }, [isLoading, user, router, userRole]);

  if (isLoading || !user || !userRole) {
    return null;
  }

  if (userRole !== 'worker') {
    return null;
  }

  if (Platform.OS === 'web') {
    return <Redirect href="/mobile-only" />;
  }

  if (isSubscriptionExpired) {
    return <SubscriptionLockScreen />;
  }

  // This is the tab navigator from the old tabs/_layout.tsx
  return (
    <BottomTabs
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarStyle: {
          backgroundColor: theme.colors.pageBackground,
          borderTopColor: theme.colors.borderColor,
        },
        tabBarLabel: ({ color, children }) => (
          <Text style={{ color, fontSize: 11, marginBottom: 2 }} fontType="regular">
            {children}
          </Text>
        ),
      }}
    >
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
          tabBarIcon: ({ color, size }: { color: string; size:number }) => (
            <Ionicons name="bar-chart-outline" color={color} size={size} />
          ),
        }}
      />
      <BottomTabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </BottomTabs>
  );
}

export default function WorkerLayout() {
  return <ProtectedWorkerLayout />;
}
