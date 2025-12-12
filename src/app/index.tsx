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
    // User is logged in and role is determined, redirect based on role
    return <Redirect href={userRole === 'worker' ? "/(worker)/home" : "/(manager)/dashboard"} />;
  } else {
    // Not logged in or role not determined, redirect to guest login (or landing page if desired)
    return <Redirect href="/(guest)/login" />;
  }
}
