import { Redirect } from "expo-router";
import { useSession } from "../context/AuthContext";
import { ActivityIndicator, View } from "react-native";
import { theme } from "../theme";

export default function Index() {
  const { user, isLoading, userRole } = useSession();

  if (isLoading) {
    // Show a loading indicator while session is loading
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.pageBackground }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (user && userRole) {
    if (userRole === 'worker') {
      return <Redirect href="/(worker)/home" />;
    }

    const subscriptionStatus = user.app_metadata?.subscription_status;
    const companySetupComplete = user.user_metadata?.company_setup_complete || false;

    if (subscriptionStatus !== 'active') {
      return <Redirect href="/subscription/setup" />;
    }

    if (!companySetupComplete) {
      return <Redirect href="/(manager)/company-setup" />;
    }

    return <Redirect href="/(manager)/dashboard" />;
  } else {
    // Not logged in or role not determined, redirect to landing page
    return <Redirect href="/(guest)" />;
  }
}
