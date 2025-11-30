import { Redirect } from "expo-router";

export default function Index() {
  // TODO: role based redirect
  return <Redirect href="/(manager)/dashboard" />;
}
