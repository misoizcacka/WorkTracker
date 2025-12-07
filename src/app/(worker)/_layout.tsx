import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useSession } from "../../context/AuthContext";

function ProtectedWorkerLayout() {
  const { user, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user) {
      return;
    }

    const role = user.app_metadata?.role || user.user_metadata.role;

    if (role && role !== 'worker') { // Only redirect if role is defined and it's the wrong one
      router.replace('/(manager)/dashboard');
    }
  }, [isLoading, user, router]);

  const role = user?.app_metadata?.role || user?.user_metadata.role;

  if (isLoading || !user || !role) { // Also check for role existence
    return null; // Or a global loading spinner
  }

  if (role !== 'worker') {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="tabs" options={{ statusBarStyle: 'light' }} />
      <Stack.Screen name="[id]" options={{ statusBarStyle: 'light' }} />
    </Stack>
  );
}

export default function WorkerLayout() {
  return <ProtectedWorkerLayout />;
}