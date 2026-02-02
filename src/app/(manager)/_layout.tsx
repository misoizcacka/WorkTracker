import React, { useEffect } from "react";
import { Image, Pressable } from "react-native";
import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { withLayoutContext, useRouter, useSegments, Link } from 'expo-router'; // Added Link
import { useDebouncedWindowDimensions } from "../../hooks/useDebouncedWindowDimensions";
import { DrawerToggleButton } from '@react-navigation/drawer';

import { theme } from "../../theme";
import { EmployeesProvider } from "../../context/EmployeesContext";
import { ProjectsProvider } from "../../context/ProjectsContext";
import { AssignmentsProvider } from "../../context/AssignmentsContext";
import { InvitesProvider } from "../../context/InvitesContext";
import { useSession } from "../../context/AuthContext";


const { Navigator } = createBottomTabNavigator();

export const BottomTabs = withLayoutContext(Navigator);

import { StatusBar } from "expo-status-bar";

import { ProfileProvider } from "../../context/ProfileContext";

function ManagerProviders({ children }: { children: React.ReactNode }) {
  const { user, isLoading, userRole } = useSession(); // Add userRole here
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    // Only apply this logic for managers/owners
    if (user && (userRole === 'manager' || userRole === 'owner')) {
      const companySetupComplete = user.user_metadata?.company_setup_complete || false;
      const inCompanySetup = segments.includes('company-setup');
      const inSubscriptionFlow = segments.includes('subscription'); // Check if currently in subscription flow

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


export default function TabsLayout() { // Renamed from ManagerLayout
  const { width } = useDebouncedWindowDimensions(50);
  const isLargeScreen = width >= 900;

  // Add these lines
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
    return '/(guest)'; // Default fallback
  };

  return (
    <>
      <StatusBar style="dark" backgroundColor={theme.colors.cardBackground} />
      {isLargeScreen ? (
        // 🖥️ Web/Desktop → Sidebar Drawer
        <ManagerProviders>
          <Drawer
            screenOptions={{
              headerShown: true,
              headerLeft: () => <DrawerToggleButton tintColor={theme.colors.bodyText} />, // Add DrawerToggleButton here
              headerStyle: {
                backgroundColor: theme.colors.cardBackground,
                elevation: 0, // Remove shadow on Android
                shadowOpacity: 0, // Remove shadow on iOS
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.borderColor,
              },
              headerTintColor: theme.colors.bodyText,
              headerTitle: () => (
                <Link href={getLogoHref()} asChild>
                  <Pressable>
                    <Image
                      source={require('../../../assets/logokoordblack.png')}
                      style={{ width: 150, height: 40, resizeMode: 'contain' }}
                    />
                  </Pressable>
                </Link>
              ),
              drawerStyle: { backgroundColor: theme.colors.pageBackground, width: 260 },
              drawerActiveTintColor: "#2563EB",
              drawerLabelStyle: { fontSize: 16, fontWeight: "500" },
              drawerItemStyle: { display: 'none' }                                                                                                                  
            }}
          >
            <Drawer.Screen
              name="dashboard"
              options={{
                title: "Dashboard",
                drawerIcon: ({ color, size }: { color: string; size: number }) => (
                  <Ionicons name="home-outline" color={color} size={size} />
                ),
                drawerItemStyle: { display: 'flex' },
              }}
            />
            <Drawer.Screen
              name="map-overview"
              options={{
                title: "Map Overview",
                drawerIcon: ({ color, size }: { color: string; size: number }) => (
                  <Ionicons name="map-outline" color={color} size={size} />
                ),
                drawerItemStyle: { display: 'flex' },
              }}
            />
            <Drawer.Screen
              name="location-replay"
              options={{
                title: "Location Replay",
                drawerIcon: ({ color, size }: { color: string; size: number }) => (
                  <Ionicons name="timer-outline" color={color} size={size} />
                ),
                drawerItemStyle: { display: 'flex' },
              }}
            />
            <Drawer.Screen
              name="employees"
              options={{
                title: "Employees",
                drawerIcon: ({ color, size }: { color: string; size: number }) => (
                  <Ionicons name="people-outline" color={color} size={size} />
                ),
                drawerItemStyle: { display: 'flex' },
              }}
            />
            <Drawer.Screen
              name="projects"
              options={{
                title: "Projects",
                drawerIcon: ({ color, size }: { color: string; size: number }) => (
                  <Ionicons name="folder-outline" color={color} size={size} />
                ),
                drawerItemStyle: { display: 'flex' },
              }}
            />

            <Drawer.Screen
              name="worker-assignments"
              options={{
                title: "Worker Assignments",
                drawerIcon: ({ color, size }: { color: string; size: number }) => (
                  <Ionicons name="calendar-outline" color={color} size={size} />
                ),
                drawerItemStyle: { display: 'flex' },
              }}
            />

            <Drawer.Screen
              name="corrections"
              options={{
                title: "Session Corrections",
                drawerIcon: ({ color, size }: { color: string; size: number }) => (
                  <Ionicons name="construct-outline" color={color} size={size} />
                ),
                drawerItemStyle: { display: 'flex' },
              }}
            />
            <Drawer.Screen
              name="reports"
              options={{
                title: "Reports",
                drawerIcon: ({ color, size }: { color: string; size: number }) => (
                  <Ionicons name="document-text-outline" color={color} size={size} />
                ),
                drawerItemStyle: { display: 'flex' },
              }}
            />
            <Drawer.Screen
              name="account"
              options={{
                title: "Account",
                drawerIcon: ({ color, size }: { color: string; size: number }) => (
                  <Ionicons name="person-circle-outline" color={color} size={size} />
                ),
                drawerItemStyle: { display: 'flex' },
              }}
            />
            <Drawer.Screen
              name="company-setup"
              options={{ headerShown: false }}
            />
            <Drawer.Screen
              name="setup-complete"
            />
          </Drawer>
        </ManagerProviders>
      ) : (
        // 📱 Mobile → Tabs
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