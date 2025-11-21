import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { theme } from '../../theme';
import { Button } from '../../components/Button';
import AnimatedScreen from '../../components/AnimatedScreen';

export default function InvalidInviteScreen() {
  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Invalid Invitation</Text>
        <Text style={styles.message}>
          The invitation link is either invalid or has already been used. Please request a new invite.
        </Text>
        <Link href="/(guest)/login" asChild>
          <Button title="Back to Login" />
        </Link>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.pageBackground,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.danger,
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: theme.colors.bodyText,
    marginBottom: 30,
  },
});