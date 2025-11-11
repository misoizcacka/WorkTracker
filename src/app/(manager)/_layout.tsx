import React from "react";
import { useWindowDimensions, Image } from "react-native";
import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { withLayoutContext } from 'expo-router';

import { WorkersProvider } from "./WorkersContext";

const { Navigator } = createBottomTabNavigator();

export const BottomTabs = withLayoutContext(Navigator);

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
            headerStyle: {
              backgroundColor: '#f7f7f7',
              elevation: 0, // Remove shadow on Android
              shadowOpacity: 0, // Remove shadow on iOS
            },
            headerTitle: () => (
              <Image
                source={require('../../../assets/logowhitenavy.png')}
                style={{ width: 150, height: 40, resizeMode: 'contain' }}
              />
            ),
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
      <BottomTabs
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.primary, // Use navy from theme
            elevation: 0, // Remove shadow on Android
            shadowOpacity: 0, // Remove shadow on iOS
          },
          headerTitle: () => (
            <Image
              source={require('../../../assets/logowhitenavy.png')}
              style={{ width: 150, height: 40, resizeMode: 'contain' }}
            />
          ),
          tabBarActiveTintColor: "#fff",
                  tabBarStyle: {
                    backgroundColor: "rgba(0,0,0,0.25)",
                    borderTopWidth: 0,
                    elevation: 0,
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                  },          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
          },
        }}
      >
        <BottomTabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="bar-chart-outline" color={color} size={size} />
            ),
          }}
        />
        <BottomTabs.Screen
          name="workers"
          options={{
            title: "Workers",
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="people-outline" color={color} size={size} />
            ),
          }}
        />
        <BottomTabs.Screen
          name="reports"
          options={{
            title: "Reports",
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="document-text-outline" color={color} size={size} />
            ),
          }}
        />
        <BottomTabs.Screen
          name="account"
          options={{
            title: "Account",
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="person-circle-outline" color={color} size={size} />
            ),
          }}
        />
      </BottomTabs>
    </WorkersProvider>
  );
}
