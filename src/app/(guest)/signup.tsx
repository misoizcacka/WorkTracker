import { Redirect } from 'expo-router';

export default function SignupFallback() {
  // This component should ideally not be reached on native platforms
  // as signup is web-specific. If it is, we can redirect to login.
  return <Redirect href="/(guest)/login" />;
}