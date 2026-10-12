/**
 * Config plugin that forces AGP to 8.10.1 via pluginManagement resolutionStrategy.
 *
 * React Native 0.81.5 ships AGP 8.11.0 which introduced AgpVersionAttr —
 * a new variant attribute that community packages (react-native-maps,
 * react-native-reanimated, react-native-worklets, etc.) don't declare,
 * causing "No variants exist" errors on all of them.
 *
 * AGP 8.10.1 does not enforce this attribute and is compatible with
 * current community RN packages.
 */
const { withSettingsGradle } = require('@expo/config-plugins');

const RESOLUTION_STRATEGY = [
  '',
  '  // Force AGP to 8.10.1 — AGP 8.11.0 (RN 0.81.5) introduced AgpVersionAttr',
  '  // which breaks community packages that do not declare it.',
  '  resolutionStrategy {',
  '    eachPlugin {',
  '      if (requested.id.id == "com.android.application" ||',
  '          requested.id.id == "com.android.library") {',
  '        useVersion("8.10.1")',
  '      }',
  '    }',
  '  }',
].join('\n');

const withDowngradeAgp = (config) => {
  return withSettingsGradle(config, (config) => {
    const contents = config.modResults.contents;

    // Only inject once
    if (contents.includes('Force AGP to 8.10.1')) {
      return config;
    }

    // Inject resolutionStrategy inside the pluginManagement { } block,
    // right before its closing brace
    config.modResults.contents = contents.replace(
      /(pluginManagement\s*\{)([\s\S]*?)(\n\})/,
      (match, open, body, close) => open + body + RESOLUTION_STRATEGY + close
    );

    return config;
  });
};

module.exports = withDowngradeAgp;
