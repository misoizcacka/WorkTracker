const { withAndroidManifest } = require('@expo/config-plugins');

// Google Play filters out devices that lack a *required* hardware feature.
// Android adds some requirements implicitly:
//  - android.hardware.screen.portrait: the activity is locked to portrait (orientation: 'portrait')
//  - android.hardware.wifi: permissions such as ACCESS_WIFI_STATE (added by @react-native-community/netinfo)
// Neither is essential to the app, so declare them as optional to keep it installable on all devices.
// An explicit <uses-feature ... required="false"> overrides the implied requirement.
const OPTIONAL_FEATURES = [
  'android.hardware.screen.portrait',
  'android.hardware.wifi',
];

const withOptionalHardwareFeatures = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!Array.isArray(manifest['uses-feature'])) {
      manifest['uses-feature'] = [];
    }

    for (const name of OPTIONAL_FEATURES) {
      const existing = manifest['uses-feature'].find((f) => f.$ && f.$['android:name'] === name);
      if (existing) {
        existing.$['android:required'] = 'false';
      } else {
        manifest['uses-feature'].push({
          $: { 'android:name': name, 'android:required': 'false' },
        });
      }
    }

    return config;
  });

module.exports = withOptionalHardwareFeatures;
