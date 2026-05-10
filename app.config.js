const appJson = require('./app.json');

const appDomain = process.env.EXPO_PUBLIC_APP_DOMAIN || 'app.domain.com';
const appStoreUrl = process.env.EXPO_PUBLIC_APP_STORE_URL || 'https://apps.apple.com/app/id0000000000';
const playStoreUrl = process.env.EXPO_PUBLIC_PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=app.koord';
const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '';

module.exports = () => {
  const config = appJson.expo;

  return {
    ...config,
    android: {
      ...config.android,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: appDomain,
              pathPrefix: '/join',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
      config: {
        googleMaps: {
          apiKey: googleMapsKey,
        },
      },
    },
    ios: {
      ...config.ios,
      associatedDomains: [`applinks:${appDomain}`],
    },
    extra: {
      ...config.extra,
      appDomain,
      appStoreUrl,
      playStoreUrl,
    },
  };
};
