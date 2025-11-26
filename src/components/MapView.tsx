import { Platform } from 'react-native';
import { MapViewProps as RNMapViewProps, MapMarkerProps, MapCalloutProps } from 'react-native-maps';

interface WorkerLocation {
  id: string;
  name: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  avatar?: string;
  lastSeen?: string;
  address?: string;
}

interface ProjectLocation {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  color?: string;
}

interface CommonMapViewProps extends RNMapViewProps {
  workers?: WorkerLocation[];
  selectedWorkers?: WorkerLocation[];
  selectedProjects?: ProjectLocation[];
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

let MapView: React.ComponentType<CommonMapViewProps>;
let Marker: React.ComponentType<MapMarkerProps>;
let Callout: React.ComponentType<MapCalloutProps>;

if (Platform.OS === 'web') {
  MapView = require('./MapView.web').MapView;
  Marker = require('./MapView.web').Marker;
  Callout = require('./MapView.web').Callout;
} else {
  MapView = require('./MapView.native').MapView;
  Marker = require('./MapView.native').Marker;
  Callout = require('./MapView.native').Callout;
}

export { MapView, Marker, Callout };
