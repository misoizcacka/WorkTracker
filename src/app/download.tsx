import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, Linking, Image, TouchableOpacity as RNTouchableOpacity, Pressable } from 'react-native';
import { Text } from '~/components/Themed';
import { theme } from '~/theme';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '~/components/Button';

// Use Pressable on web, TouchableOpacity on native
const TouchableOpacity = Platform.OS === 'web' ? Pressable : RNTouchableOpacity;

const PLAY_STORE_URL = process.env.EXPO_PUBLIC_PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=app.koordinate';
const APP_STORE_URL = process.env.EXPO_PUBLIC_APP_STORE_URL || 'https://apps.apple.com/app/id0000000000';

export default function DownloadPage() {
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    // Detect device type
    if (Platform.OS === 'ios') {
      setDeviceType('ios');
      // Auto-redirect on iOS devices
      setTimeout(() => {
        Linking.openURL(APP_STORE_URL);
      }, 1000);
    } else if (Platform.OS === 'android') {
      setDeviceType('android');
      // Auto-redirect on Android devices
      setTimeout(() => {
        Linking.openURL(PLAY_STORE_URL);
      }, 1000);
    } else if (Platform.OS === 'web') {
      // Detect mobile browsers on web
      const userAgent = navigator.userAgent || navigator.vendor;
      if (/android/i.test(userAgent)) {
        setDeviceType('android');
        window.location.href = PLAY_STORE_URL;
      } else if (/iPad|iPhone|iPod/.test(userAgent)) {
        setDeviceType('ios');
        window.location.href = APP_STORE_URL;
      } else {
        setDeviceType('desktop');
      }
    }
  }, []);

  const handleDownload = (store: 'ios' | 'android') => {
    const url = store === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  if (deviceType === 'ios') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="logo-apple" size={80} color={theme.colors.primary} style={styles.icon} />
          <Text style={styles.title} fontType="bold">
            Redirecting to App Store...
          </Text>
          <Text style={styles.subtitle} fontType="regular">
            Download Koordinate for iPhone
          </Text>
          <Button
            title="Open App Store"
            onPress={() => handleDownload('ios')}
            style={styles.button}
          />
        </View>
      </View>
    );
  }

  if (deviceType === 'android') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="logo-google-playstore" size={80} color={theme.colors.primary} style={styles.icon} />
          <Text style={styles.title} fontType="bold">
            Redirecting to Play Store...
          </Text>
          <Text style={styles.subtitle} fontType="regular">
            Download Koordinate for Android
          </Text>
          <Button
            title="Open Play Store"
            onPress={() => handleDownload('android')}
            style={styles.button}
          />
        </View>
      </View>
    );
  }

  // Desktop view - show both options + QR code
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/koordinatelogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <Text style={styles.title} fontType="bold">
          Download Koordinate
        </Text>
        <Text style={styles.subtitle} fontType="regular">
          Track your work hours on mobile
        </Text>

        <View style={styles.desktopContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle} fontType="bold">
              Scan with your phone
            </Text>
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code-outline" size={120} color={theme.colors.bodyText} />
              <Text style={styles.qrText} fontType="regular">
                QR Code coming soon
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle} fontType="bold">
              Or visit on your phone
            </Text>
            
            <View style={styles.storeButtons}>
              <TouchableOpacity
                style={styles.storeButtonTouchable}
                onPress={() => handleDownload('ios')}
              >
                <Ionicons name="logo-apple" size={24} color="white" />
                <Text style={styles.storeButtonText} fontType="bold">
                  Download on App Store
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.storeButtonTouchable}
                onPress={() => handleDownload('android')}
              >
                <Ionicons name="logo-google-playstore" size={24} color="white" />
                <Text style={styles.storeButtonText} fontType="bold">
                  Get it on Google Play
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.urlBox}>
              <Text style={styles.urlText} fontType="regular">
                koordinate.app/download
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText} fontType="regular">
            This is the <Text fontType="bold">worker mobile app</Text>. Managers use the web dashboard.
          </Text>
        </View>
      </View>
    </View>
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
  content: {
    maxWidth: 800,
    width: '100%',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: theme.spacing(3),
  },
  logo: {
    width: 180,
    height: 48,
  },
  icon: {
    marginBottom: theme.spacing(2),
  },
  title: {
    fontSize: 32,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(4),
    textAlign: 'center',
  },
  button: {
    marginTop: theme.spacing(2),
    minWidth: 250,
  },
  desktopContent: {
    width: '100%',
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: theme.spacing(4),
    marginBottom: theme.spacing(4),
  },
  section: {
    flex: 1,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.borderColor,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(2),
  },
  qrText: {
    marginTop: theme.spacing(1),
    color: theme.colors.bodyText,
    fontSize: theme.fontSizes.sm,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: theme.colors.borderColor,
    ...(Platform.OS !== 'web' && {
      width: '100%',
      height: 1,
    }),
  },
  storeButtons: {
    width: '100%',
    gap: theme.spacing(2),
    alignItems: 'center',
  },
  storeButtonTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(2),
    borderRadius: theme.radius.md,
    width: '100%',
    maxWidth: 300,
  },
  storeButtonText: {
    color: 'white',
    fontSize: theme.fontSizes.md,
  },
  urlBox: {
    marginTop: theme.spacing(3),
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  urlText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
    backgroundColor: theme.colors.primaryMuted,
    padding: theme.spacing(2),
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(2),
    maxWidth: 500,
  },
  infoText: {
    flex: 1,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
    lineHeight: 20,
  },
});
