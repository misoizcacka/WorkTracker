import React from "react";
import { useWindowDimensions } from "react-native";
import { Tabs } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";

export default function WorkerTabsLayout() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 900;

  if (isLargeScreen) {
    // 🖥️ Web/Desktop → Sidebar Drawer
    return (
      <Drawer
        screenOptions={{
          headerShown: true,
          drawerStyle: { backgroundColor: "#f7f7f7", width: 260 },
          drawerActiveTintColor: theme.colors.primary,
          drawerLabelStyle: { fontSize: 16, fontWeight: "500" },
        }}
      >
        <Drawer.Screen
          name="home"
          options={{
            title: "Home",
            drawerIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="time-outline" color={color} size={size} />
            ),
          }}
        />
        <Drawer.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            drawerIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="bar-chart-outline" color={color} size={size} />
            ),
          }}
        />
        <Drawer.Screen
          name="account"
          options={{
            title: "Account",
            drawerIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="person-outline" color={color} size={size} />
            ),
          }}
        />
      </Drawer>
    );
  }

  // 📱 Mobile → Tabs
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#ddd",
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="time-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="bar-chart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
