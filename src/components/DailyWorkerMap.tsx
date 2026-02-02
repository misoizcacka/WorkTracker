import { Platform } from 'react-native';
import { DailyWorkerMapProps } from './DailyWorkerMap.native'; // Assuming types are defined here or a common type file

let DailyWorkerMap: React.ComponentType<DailyWorkerMapProps & any>;

if (Platform.OS === 'web') {
  DailyWorkerMap = require('./DailyWorkerMap.web').default;
} else {
  DailyWorkerMap = require('./DailyWorkerMap.native').default;
}

export default DailyWorkerMap;
