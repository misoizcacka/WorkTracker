import React from "react";
import { Image } from "react-native";
import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { withLayoutContext } from 'expo-router';
import { useDebouncedWindowDimensions } from "../../hooks/useDebouncedWindowDimensions";

import { theme } from "../../theme";
import { WorkersProvider } from "./WorkersContext";

import { ProjectsProvider } from "./ProjectsContext";
import { AssignmentsProvider } from "./AssignmentsContext";

import { InvitesProvider } from "./InvitesContext";

const { Navigator } = createBottomTabNavigator();

export const BottomTabs = withLayoutContext(Navigator);

function ManagerProviders({ children }: { children: React.ReactNode }) {
  return (
    <WorkersProvider>
      <ProjectsProvider>
        <AssignmentsProvider>
          <InvitesProvider>
            {children}
          </InvitesProvider>
        </AssignmentsProvider>
      </ProjectsProvider>
    </WorkersProvider>
  );
}

export default function ManagerLayout() {
  const { width } = useDebouncedWindowDimensions(50);
  const isLargeScreen = width >= 900;

  if (isLargeScreen) {
    // 🖥️ Web/Desktop → Sidebar Drawer
    return (
      <ManagerProviders>
        <Drawer
          screenOptions={{
            headerShown: true,
            headerStyle: {
              backgroundColor: theme.colors.primary,
              elevation: 0, // Remove shadow on Android
              shadowOpacity: 0, // Remove shadow on iOS
            },
            headerTintColor: theme.colors.pageBackground,
            headerTitle: () => (
              <Image
                source={require('../../../assets/logowhitenavy.png')}
                style={{ width: 150, height: 40, resizeMode: 'contain' }}
              />
            ),
            drawerStyle: { backgroundColor: theme.colors.pageBackground, width: 260 },
            drawerActiveTintColor: "#2563EB",
            drawerLabelStyle: { fontSize: 16, fontWeight: "500" },
          }}
        >
          <Drawer.Screen
            name="dashboard"
            options={{
              title: "Dashboard",
              drawerIcon: ({ color, size }: { color: string; size: number }) => (
                <Ionicons name="home-outline" color={color} size={size} />
              ),
            }}
          />
          <Drawer.Screen
            name="map-overview"
            options={{
              title: "Map Overview",
              drawerIcon: ({ color, size }: { color: string; size: number }) => (
                <Ionicons name="map-outline" color={color} size={size} />
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
            name="projects"
            options={{
              title: "Projects",
              drawerIcon: ({ color, size }: { color: string; size: number }) => (
                <Ionicons name="briefcase-outline" color={color} size={size} />
              ),
            }}
          />
          <Drawer.Screen
            name="project-assignment"
            options={{
              title: "Project Assignment",
              drawerIcon: ({ color, size }: { color: string; size: number }) => (
                <Ionicons name="calendar-outline" color={color} size={size} />
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
      </ManagerProviders>
    );
  }

  // 📱 Mobile → Tabs
  return (
    <ManagerProviders>
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
          tabBarActiveTintColor: theme.colors.cardBackground,
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
              <Ionicons name="home-outline" color={color} size={size} />
            ),
          }}
        />
        <BottomTabs.Screen
          name="map-overview"
          options={{
            title: "Map Overview",
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="map-outline" color={color} size={size} />
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
          name="projects"
          options={{
            title: "Projects",
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="briefcase-outline" color={color} size={size} />
            ),
          }}
        />
        <BottomTabs.Screen
          name="project-assignment"
          options={{
            title: "Assignment",
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="calendar-outline" color={color} size={size} />
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
    </ManagerProviders>
  );
}
