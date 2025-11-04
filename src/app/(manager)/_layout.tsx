import React from "react";
import { useWindowDimensions } from "react-native";
import { Tabs } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";

import { WorkersProvider } from "./WorkersContext";

export default function ManagerLayout() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 900;

  if (isLargeScreen) {
    // 🖥️ Web/Desktop → Sidebar Drawer
    return (
      <WorkersProvider>
        <Drawer
          screenOptions={{
            headerShown: true,
            drawerStyle: { backgroundColor: "#f7f7f7", width: 260 },
            drawerActiveTintColor: "#2563EB",
            drawerLabelStyle: { fontSize: 16, fontWeight: "500" },
          }}
        >
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
            name="workers"
            options={{
              title: "Workers",
              drawerIcon: ({ color, size }: { color: string; size: number }) => (
                <Ionicons name="people-outline" color={color} size={size} />
              ),
            }}
          />
          <Drawer.Screen
            name="reports"
            options={{
              title: "Reports",
              drawerIcon: ({ color, size }: { color: string; size: number }) => (
                <Ionicons name="document-text-outline" color={color} size={size} />
              ),
            }}
          />
          <Drawer.Screen
            name="account"
            options={{
              title: "Account",
              drawerIcon: ({ color, size }: { color: string; size: number }) => (
                <Ionicons name="person-circle-outline" color={color} size={size} />
              ),
            }}
          />
        </Drawer>
      </WorkersProvider>
    );
  }

  // 📱 Mobile → Tabs
  return (
    <WorkersProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#fff",
          tabBarStyle: {
            backgroundColor: "rgba(0,0,0,0.25)",
            borderTopWidth: 0,
            elevation: 0,
            position: "absolute",
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
          },
        }}
      >
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
          name="workers"
          options={{
            title: "Workers",
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="people-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: "Reports",
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="document-text-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "Account",
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="person-circle-outline" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </WorkersProvider>
  );
}
