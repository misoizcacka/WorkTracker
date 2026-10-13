import { Platform } from 'react-native';

// Platform-specific implementations
const { MapPreview } = Platform.OS === 'web'
  ? require('./MapPreview.web')
  : require('./MapPreview.native');

export { MapPreview };
