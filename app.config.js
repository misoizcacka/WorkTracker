const appDomain = process.env.EXPO_PUBLIC_APP_DOMAIN || 'koordinate.app';
const appStoreUrl = process.env.EXPO_PUBLIC_APP_STORE_URL || 'https://apps.apple.com/app/id0000000000';
const playStoreUrl = process.env.EXPO_PUBLIC_PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=app.koordinate';
const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '';

module.exports = () => {
  return {
    expo: {
    name: 'Koordinate',
    slug: 'Koord',
    owner: 'misoizcacka',
    scheme: 'koordinate',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/koordinateappicon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/koordsplashscreen.png',
      resizeMode: 'contain',
      backgroundColor: '#e0e0e0',
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        UIViewControllerBasedStatusBarAppearance: true,
        NSLocationWhenInUseUsageDescription: 'This app uses your location to track your work hours when you are checked in.',
        NSLocationAlwaysAndWhenInUseUsageDescription: 'This app uses your location in the background to track your work hours and send periodic updates even when the app is closed.',
        NSLocationAlwaysUsageDescription: 'This app uses your location in the background to track your work hours and send periodic updates.',
        UIBackgroundModes: ['location', 'fetch'],
        ITSAppUsesNonExemptEncryption: false,
        BGTaskSchedulerPermittedIdentifiers: ['app.koordinate.location.refresh'],
      },
      bundleIdentifier: 'app.koordinate',
      associatedDomains: [`applinks:${appDomain}`],
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/koordinateappicon.png',
        backgroundColor: '#000000',
      },
      softwareKeyboardLayoutMode: 'pan',
      predictiveBackGestureEnabled: false,
      permissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_BACKGROUND_LOCATION',
      ],
      package: 'app.koordinate',
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: appDomain, pathPrefix: '/join' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
      config: {
        googleMaps: { apiKey: googleMapsKey },
      },
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-router',
      'expo-audio',
      'expo-font',
      'expo-asset',
      '@react-native-community/datetimepicker',
      'expo-localization',
      'expo-secure-store',
      'expo-sharing',
      'expo-splash-screen',
      'expo-sqlite',
      'expo-status-bar',
      ['react-native-maps', { androidGoogleMapsApiKey: googleMapsKey || 'AIzaSyDE81zzchDXalQuGapH-E8tBBjnN9fT304' }],
      './plugins/with-background-location.js',
    ],
    extra: {
      router: {},
      eas: { projectId: 'f0925d88-bdef-40da-b492-7c0f4f18a55d' },
      appDomain,
      appStoreUrl,
      playStoreUrl,
    },
    },
  };
};
