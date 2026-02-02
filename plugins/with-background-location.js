const { withAndroidManifest, createRunOncePlugin } = require('@expo/config-plugins');

const pkg = require('../package.json'); // Adjust path to find the frontend package.json

const LOCATION_PERMISSIONS = [
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.ACCESS_BACKGROUND_LOCATION',
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

    // We will add iOS Info.plist modifications here later

    return config;
};

module.exports = createRunOncePlugin(withBackgroundLocation, pkg.name, pkg.version);
