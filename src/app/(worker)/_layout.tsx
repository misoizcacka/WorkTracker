import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { useSession } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { withLayoutContext } from 'expo-router';

const { Navigator } = createBottomTabNavigator();
export const BottomTabs = withLayoutContext(Navigator);

function ProtectedWorkerLayout() {
  const { user, isLoading, userRole } = useSession();
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
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
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
