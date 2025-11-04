import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SessionProvider, useSession } from './AuthContext';

export default function RootLayout() {
  return (
    <SessionProvider>
      <Main />
    </SessionProvider>
  );
}

function Main() {
  const { user, isLoading } = useSession()!;
  const segments = useSegments();
  const router = useRouter();

  // useEffect(() => {
  //   if (isLoading) return;

  //   const inAuthGroup = segments[0] === '(guest)';

  //   if (
  //     // If the user is not signed in and the initial segment is not anything in the auth group...
  //     !user &&
  //     !inAuthGroup
  //   ) {
  //     // Redirect to the login page.
  //     router.replace('/(guest)/login');
  //   } else if (user && inAuthGroup) {
  //     // Redirect away from the login page.
  //     // go to manager or worker based on role
  //     router.replace(user.role === 'manager' ? '/(manager)/dashboard' : '/(worker)/home');
  //   }
  // }, [user, segments, isLoading]);

  return <Slot />;
}