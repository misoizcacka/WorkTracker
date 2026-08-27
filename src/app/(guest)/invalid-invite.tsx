import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { theme } from '../../theme';
import { Button } from '../../components/Button';
import { Text } from '../../components/Themed';
import AnimatedScreen from '../../components/AnimatedScreen';
import { useTranslation } from 'react-i18next';

export default function InvalidInviteScreen() {
  const { t } = useTranslation();

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <Text style={styles.title} fontType="bold">{t('invalidInvite.title')}</Text>
        <Text style={styles.message} fontType="regular">
          {t('invalidInvite.message')}
        </Text>
        <Link href="/(guest)/login" asChild>
          <Button title={t('invalidInvite.backToLogin')} />
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
