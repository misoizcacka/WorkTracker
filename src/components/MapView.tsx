import React from 'react'; // Import React
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
    zoom?: number;
  };
  region?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
    zoom?: number;
  };
  zoom?: number; // New prop
  onWebZoomChange?: (zoom: number) => void; // New prop
  // Add children prop as MapView might render markers/circles as children
  children?: React.ReactNode;
}

// Dynamically import platform-specific MapView implementations
const MapViewWeb = require('./MapView.web').MapView;
const MapViewNative = require('./MapView.native').MapView;

// Dynamically import Marker and Callout
const MarkerWeb = require('./MapView.web').Marker;
const MarkerNative = require('./MapView.native').Marker;
const CalloutWeb = require('./MapView.web').Callout;
const CalloutNative = require('./MapView.native').Callout;
const CircleWeb = require('./MapView.web').Circle;
const CircleNative = require('./MapView.native').Circle;


// Create a ref-forwarding wrapper for MapView
const ForwardedMapView = React.forwardRef<any, CommonMapViewProps>((props, ref) => {
  if (Platform.OS === 'web') {
    return <MapViewWeb {...props} ref={ref} />;
  } else {
    return <MapViewNative {...props} ref={ref} />;
  }
});

// Create ref-forwarding wrappers for Marker and Callout (if needed, or just re-export)
const MarkerComponent = Platform.OS === 'web' ? MarkerWeb : MarkerNative;
const CalloutComponent = Platform.OS === 'web' ? CalloutWeb : CalloutNative;
const CircleComponent = Platform.OS === 'web' ? CircleWeb : CircleNative;

export { ForwardedMapView as MapView, MarkerComponent as Marker, CalloutComponent as Callout, CircleComponent as Circle };
