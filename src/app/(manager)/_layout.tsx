import React, { useEffect } from "react";
import { View } from "react-native";
import { useRouter, useSegments, Slot } from 'expo-router';
import { useDebouncedWindowDimensions } from "../../hooks/useDebouncedWindowDimensions";

import { theme } from "../../theme";
import { EmployeesProvider } from "../../context/EmployeesContext";
import { ProjectsProvider } from "../../context/ProjectsContext";
import { AssignmentsProvider } from "../../context/AssignmentsContext";
import { InvitesProvider } from "../../context/InvitesContext";
import { useSession } from "../../context/AuthContext";
import { ManagerSidebar } from "./components/ManagerSidebar";

import { StatusBar } from "expo-status-bar";

import { ProfileProvider } from "../../context/ProfileContext";
import { SubscriptionLockScreen } from "../../components/SubscriptionLockScreen";

function ManagerProviders({ children }: { children: React.ReactNode }) {
  const { user, isLoading, userRole, isSubscriptionExpired } = useSession();
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

  if (isLoading || !user || (userRole !== 'manager' && userRole !== 'owner')) {
    return null;
  }

  const inSubscriptionFlow = segments.includes('subscription');
  const showLock = isSubscriptionExpired && !inSubscriptionFlow;

  return (
    <ProfileProvider>
      <EmployeesProvider>
        <ProjectsProvider>
          <AssignmentsProvider>
            <InvitesProvider>
              {showLock ? <SubscriptionLockScreen /> : children}
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
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading, userRole } = useSession();

  // Redirect to mobile-only if a manager tries to access via a small screen (mobile web)
  useEffect(() => {
    if (width > 0 && !isLargeScreen) {
      // Allow only the mobile-only screen itself to be viewed
      if (!segments.includes('mobile-only')) {
        router.replace('/mobile-only');
      }
    }
  }, [width, isLargeScreen, segments, router]);

  if (isLoading || !user || (userRole !== 'manager' && userRole !== 'owner')) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor={theme.colors.cardBackground} />
      <ManagerProviders>
        {isLargeScreen ? (
          <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.colors.pageBackground }}>
            <ManagerSidebar />
            <View style={{ flex: 1 }}>
              <Slot />
            </View>
          </View>
        ) : null}
      </ManagerProviders>
    </>
  );
}
