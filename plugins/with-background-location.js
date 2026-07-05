const { withAndroidManifest, withInfoPlist, createRunOncePlugin } = require('@expo/config-plugins');

const pkg = require('../package.json'); // Adjust path to find the frontend package.json

const LOCATION_PERMISSIONS = [
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.ACCESS_BACKGROUND_LOCATION',
    'android.permission.FOREGROUND_SERVICE_LOCATION', // Required for Android 14+ location foreground services
];

const withBackgroundLocation = (config) => {
    // Add permissions to AndroidManifest.xml
    config = withAndroidManifest(config, async (config) => {
        const androidManifest = config.modResults;

        const existingPermissions = androidManifest.manifest['uses-permission']?.map(p => p.$['android:name']) || [];

        const permissionsToAdd = LOCATION_PERMISSIONS.filter(p => !existingPermissions.includes(p));

        if (permissionsToAdd.length > 0) {
            if (!Array.isArray(androidManifest.manifest['uses-permission'])) {
                androidManifest.manifest['uses-permission'] = [];
            }
            permissionsToAdd.forEach(permission => {
                androidManifest.manifest['uses-permission'].push({
                    $: { 'android:name': permission },
                });
            });
        }
        
        return config;
    });

    config = withInfoPlist(config, (config) => {
        const modes = new Set(config.modResults.UIBackgroundModes || []);
        modes.add('location');

        config.modResults.UIBackgroundModes = Array.from(modes);
        config.modResults.NSLocationWhenInUseUsageDescription =
            config.modResults.NSLocationWhenInUseUsageDescription ||
            'This app uses your location to track your work hours when you are checked in.';
        config.modResults.NSLocationAlwaysAndWhenInUseUsageDescription =
            config.modResults.NSLocationAlwaysAndWhenInUseUsageDescription ||
            'This app uses your location in the background to track your work hours and send periodic updates even when the app is closed.';
        config.modResults.NSLocationAlwaysUsageDescription =
            config.modResults.NSLocationAlwaysUsageDescription ||
            'This app uses your location in the background to track your work hours and send periodic updates.';

        return config;
    });

    return config;
};

module.exports = createRunOncePlugin(withBackgroundLocation, pkg.name, pkg.version);
