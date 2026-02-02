const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Customize the config before returning it.
  config.resolve.alias['react-native-maps'] = 'react-native-web-maps';

  // Add rule for CSS files
  config.module.rules.push({
    test: /\.css$/,
    use: ['style-loader', 'css-loader'],
  });

  // Add fallback for maplibre-gl-native if it exists
  // This is a common practice for map libraries in React Native Web setups
  // to prevent Webpack from trying to bundle native modules for web.
  if (!config.resolve.fallback) {
    config.resolve.fallback = {};
  }
  config.resolve.fallback['maplibre-gl-native'] = false; // Prevents Webpack from bundling native module for web.

  // Explicitly add node_modules to resolution paths
  if (!config.resolve.modules) {
    config.resolve.modules = [];
  }
  config.resolve.modules.push(path.resolve(__dirname, 'node_modules'));
  config.resolve.modules.push('node_modules');

  return config;
};
