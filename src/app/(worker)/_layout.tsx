import React from "react";
import { Stack } from "expo-router";
import { Image } from "react-native";
import { theme } from "../../theme";

export default function WorkerLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.cardBackground,
        headerTitle: () => (
          <Image
            source={require('../../../assets/logowhitenavy.png')}
            style={{ width: 150, height: 40, resizeMode: 'contain' }}
          />
        ),
      }}
    >
      <Stack.Screen name="tabs" options={{ headerShown: true }} />
      <Stack.Screen name="[id]" options={{ headerShown: true }} />
    </Stack>
  )
}