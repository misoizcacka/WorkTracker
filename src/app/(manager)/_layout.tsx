import React, { useEffect } from "react";
import { Image, Pressable, View } from "react-native";
import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { withLayoutContext, useRouter, useSegments, Link, Slot } from 'expo-router';
import { useDebouncedWindowDimensions } from "../../hooks/useDebouncedWindowDimensions";
import { DrawerToggleButton } from '@react-navigation/drawer';

import { theme } from "../../theme";
import { EmployeesProvider } from "../../context/EmployeesContext";
import { ProjectsProvider } from "../../context/ProjectsContext";
import { AssignmentsProvider } from "../../context/AssignmentsContext";
import { InvitesProvider } from "../../context/InvitesContext";
import { useSession } from "../../context/AuthContext";
import { ManagerSidebar } from "./components/ManagerSidebar";


const { Navigator } = createBottomTabNavigator();

export const BottomTabs = withLayoutContext(Navigator);

import { StatusBar } from "expo-status-bar";

import { ProfileProvider } from "../../context/ProfileContext";

function ManagerProviders({ children }: { children: React.ReactNode }) {
  const { user, isLoading, userRole } = useSession();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    if (user && (userRole === 'manager' || userRole === 'owner')) {
      const companySetupComplete = user.user_metadata?.company_setup_complete || false;
      const inCompanySetup = segments.includes('company-setup');
      const inSubscriptionFlow = segments.includes('subscription');

      if (!companySetupComplete && !inCompanySetup && !inSubscriptionFlow) {
        router.replace('/(manager)/company-setup');
      }
    }
  }, [user, segments, router, isLoading, userRole]);

  return (
    <ProfileProvider>
      <EmployeesProvider>
        <ProjectsProvider>
          <AssignmentsProvider>
            <InvitesProvider>
              {children}
            </InvitesProvider>
          </AssignmentsProvider>
        </ProjectsProvider>
      </EmployeesProvider>
    </ProfileProvider>
  );
}


export default function TabsLayout() {
  const { width } = useDebouncedWindowDimensions(50);
  const isLargeScreen = width >= 900;

  const { user, userRole } = useSession();
  const getLogoHref = () => {
    if (!user) {
      return '/(guest)';
    }
    if (userRole === 'manager' || userRole === 'owner') {
      return '/(manager)/dashboard';
    } else if (userRole === 'worker') {
      return '/(worker)/home';
    }
    return '/(guest)';
  };

  return (
    <>
      <StatusBar style="dark" backgroundColor={theme.colors.cardBackground} />
      {isLargeScreen ? (
        <ManagerProviders>
          <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.colors.pageBackground }}>
            <ManagerSidebar />
            <View style={{ flex: 1 }}>
              <Slot />
            </View>
          </View>
        </ManagerProviders>
      ) : (
        <ManagerProviders>
          <BottomTabs
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: theme.colors.cardBackground,
              tabBarStyle: {
                backgroundColor: "rgba(0,0,0,0.25)",
                borderTopWidth: 0,
                elevation: 0,
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
              },
              tabBarLabelStyle: {
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
              name="employees"
              options={{
                title: "Employees",
                tabBarIcon: ({ color, size }: { color: string; size: number }) => (
                  <Ionicons name="people-outline" color={color} size={size} />
                ),
              }}
            />
            <BottomTabs.Screen
              name="projects/index"
              options={{
                title: "Projects",
                tabBarIcon: ({ color, size }: { color: string; size: number }) => (
                  <Ionicons name="folder-outline" color={color} size={size} />
                ),
              }}
            />
            <BottomTabs.Screen
              name="worker-assignments"
              options={{
                title: "Worker Assignment",
                tabBarIcon: ({ color, size }: { color: string; size: number }) => (
                  <Ionicons name="calendar-outline" color={color} size={size} />
                ),
              }}
            />
            <BottomTabs.Screen
              name="reports/index"
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
      )}
    </>
  );
}
