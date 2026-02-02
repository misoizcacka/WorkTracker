import React, { useMemo } from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps'; // Import for native maps
import { View, StyleSheet, Text } from 'react-native';
import { FeatureCollection, Point, LineString, Feature } from 'geojson'; // Still need GeoJSON types for interfaces
import moment from 'moment';
import { Assignment, LocationEvent } from '~/hooks/useMapGeoJSON'; // Import Assignment and LocationEvent

// Props for the DailyWorkerMap component
export interface DailyWorkerMapProps {
  assignments: Assignment[];
  locationEvents: LocationEvent[];
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
    zoom?: number; // Added optional zoom property
  };
  region?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
    zoom?: number; // Added optional zoom property
  };
  zoom?: number;
  onWebZoomChange?: (zoom: number) => void;
  workerId: string; // Pass workerId for map context/labels
  style?: any; // Use 'any' for React Native style prop

  // GeoJSON props that will be passed down
  assignmentPointsGeoJSON: FeatureCollection<Point>;
  assignmentSegmentsGeoJSON: FeatureCollection<LineString>;
  fullTrailGeoJSON: FeatureCollection<LineString>;
}

const DailyWorkerMapNative: React.FC<DailyWorkerMapProps> = (props) => {
  const {
    assignments,
    locationEvents,
    region,
    style,
    assignmentPointsGeoJSON,
    assignmentSegmentsGeoJSON,
    fullTrailGeoJSON,
  } = props;

  // Render full trail
  const trailCoordinates = useMemo(() => {
    if (!fullTrailGeoJSON || fullTrailGeoJSON.features.length === 0) return [];
    const coordinates = (fullTrailGeoJSON.features[0].geometry as LineString).coordinates;
    return coordinates.map(coord => ({
      latitude: coord[1],
      longitude: coord[0],
    }));
  }, [fullTrailGeoJSON]);

  // Render assignment segments
  const assignmentSegments = useMemo(() => {
    if (!assignmentSegmentsGeoJSON || assignmentSegmentsGeoJSON.features.length === 0) return [];
    return assignmentSegmentsGeoJSON.features.map(feature => {
      const coordinates = (feature.geometry as LineString).coordinates;
      return coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0],
      }));
    });
  }, [assignmentSegmentsGeoJSON]);

  // Render assignment points
  const assignmentMarkers = useMemo(() => {
    if (!assignmentPointsGeoJSON || assignmentPointsGeoJSON.features.length === 0) return [];
    return assignmentPointsGeoJSON.features.map(feature => {
      const coordinates = (feature.geometry as Point).coordinates;
      return {
        latitude: coordinates[1],
        longitude: coordinates[0],
        title: feature.properties?.name || '',
        description: `Assignment ${feature.properties?.assignmentOrder || ''}`,
        id: feature.properties?.id || '',
        assignmentOrder: feature.properties?.assignmentOrder || 0,
      };
    }).sort((a,b) => a.assignmentOrder - b.assignmentOrder); // Ensure markers are sorted
  }, [assignmentPointsGeoJSON]);


  return (
    <View style={StyleSheet.flatten([styles.mapContainer, style])}>
      <MapView
        style={styles.map}
        initialRegion={region} // Use region directly for initial, can add onRegionChange for controlled
        region={region}
      >
        {/* Render full trail */}
        {trailCoordinates.length > 1 && (
          <Polyline
            coordinates={trailCoordinates}
            strokeColor="#888888" // Dark gray
            strokeWidth={2}
            lineCap="round"
            lineJoin="round"
            zIndex={1}
          />
        )}

        {/* Render assignment segments */}
        {assignmentSegments.map((segment, segIndex) => (
          <Polyline
            key={`segment-${segIndex}`}
            coordinates={segment}
            strokeColor="#007bff" // Blue
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
            zIndex={2}
          />
        ))}

        {/* Render assignment points */}
        {assignmentMarkers.map((marker, index) => (
          <Marker
            key={marker.id}
            coordinate={marker}
            title={marker.title}
            description={marker.description}
            zIndex={3}
          >
            <View style={styles.assignmentMarker}>
              <Text style={styles.assignmentMarkerText}>{marker.assignmentOrder}</Text>
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  assignmentMarker: {
    backgroundColor: '#28a745',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  assignmentMarkerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default DailyWorkerMapNative;
