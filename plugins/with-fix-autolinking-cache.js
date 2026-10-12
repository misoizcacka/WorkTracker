/**
 * Config plugin that patches android/settings.gradle to delete the
 * Windows-generated autolinking cache before Gradle runs.
 *
 * Root cause: when you run expo prebuild on Windows, it generates
 * android/build/generated/autolinking/autolinking.json with Windows
 * absolute paths. EAS Build (Linux) restores this file from its own
 * build cache, causing all native module subprojects to produce zero
 * variants ("No variants exist").
 *
 * Fix confirmed by Expo Support: https://github.com/expo/expo/issues/42370
 */
const { withSettingsGradle } = require('@expo/config-plugins');

const AUTOLINKING_FIX = `
// Fix: delete Windows-generated autolinking cache so it always regenerates
// with correct Linux paths on the EAS build machine.
// See: https://github.com/expo/expo/issues/42370
def autolinkingCacheDir = new File(rootDir, "build/generated/autolinking")
if (!System.getProperty("os.name").toLowerCase().contains("windows")) {
    autolinkingCacheDir.deleteDir()
}
`;

const withFixAutolinkingCache = (config) => {
    return withSettingsGradle(config, (config) => {
        // Only inject if not already present
        if (!config.modResults.contents.includes('autolinkingCacheDir')) {
            // Prepend before everything else in settings.gradle
            config.modResults.contents = AUTOLINKING_FIX + config.modResults.contents;
        }
        return config;
    });
};

module.exports = withFixAutolinkingCache;
