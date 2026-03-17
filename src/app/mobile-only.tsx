import React from 'react';
import { View, StyleSheet, Image, Platform, Dimensions } from 'react-native';
import { StoreButtons } from '../components/StoreButtons';
import { Text } from '../components/Themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../context/AuthContext';
import { theme } from '../theme';
import AnimatedScreen from '../components/AnimatedScreen';
import Logo from '../../assets/koordlogoblack1.svg';

const { width } = Dimensions.get('window');

export default function MobileOnlyScreen() {
  const { userRole } = useSession();
  const isManager = userRole === 'manager' || userRole === 'owner';

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <View style={styles.card}>
          <Image source={Logo} style={styles.logo} resizeMode="contain" />
          
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{isManager ? '🖥️' : '📱'}</Text>
          </View>

          <Text style={styles.title} fontType="bold">
            {isManager ? 'Desktop Only Dashboard' : 'Mobile App Required'}
          </Text>
          
          <Text style={styles.subtitle} fontType="regular">
            {isManager 
              ? 'The Manager Dashboard is optimized for larger screens to handle complex scheduling and map tools. Please log in from a desktop browser.'
              : 'Your account is restricted to the mobile app for tracking and daily operations.'}
          </Text>

          {!isManager ? (
            <View style={styles.storeContainer}>
              <Text style={styles.storeTitle} fontType="medium">Download the app</Text>
              <StoreButtons />
            </View>
          ) : (
            <View style={styles.desktopInfo}>
              <View style={styles.bulletRow}>
                <Text style={styles.bullet}>✅</Text>
                <Text style={styles.bulletText} fontType="regular">Advanced Scheduling</Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={styles.bullet}>✅</Text>
                <Text style={styles.bulletText} fontType="regular">Real-time Map Overview</Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={styles.bullet}>✅</Text>
                <Text style={styles.bulletText} fontType="regular">Detailed Reports & Analytics</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(3),
  },
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(5),
    width: '100%',
    maxWidth: 450,
    alignItems: 'center',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      native: {
        elevation: 10,
      }
    }),
  },
  logo: {
    width: 140,
    height: 40,
    marginBottom: theme.spacing(4),
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(3),
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(2),
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing(4),
  },
  storeContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(3),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  storeTitle: {
    fontSize: 14,
    color: theme.colors.disabledText,
    marginBottom: theme.spacing(1),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  desktopInfo: {
    width: '100%',
    paddingTop: theme.spacing(3),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing(1.5),
  },
  bullet: {
    fontSize: 16,
    marginRight: theme.spacing(2),
  },
  bulletText: {
    fontSize: 16,
    color: theme.colors.bodyText,
  },
});
