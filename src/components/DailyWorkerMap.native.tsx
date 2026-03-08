import React, { useMemo } from 'react';
import MapView, { Marker, Polyline, Callout } from 'react-native-maps'; // Import for native maps
import { View, StyleSheet } from 'react-native';
import { Text } from './Themed'; // Use project-specific Text component
import { FeatureCollection, Point, LineString } from 'geojson';
import moment from 'moment';
import { Assignment, LocationEvent } from '~/hooks/useMapGeoJSON';
import { theme } from '~/theme';

export interface LocationEvent {
  lat: number;
  lng: number;
  timestamp: string; // ISO string
  type: string;
}

export interface DailyWorkerMapProps {
  assignments: Assignment[];
  locationEvents: LocationEvent[];
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
  zoom?: number;
  onWebZoomChange?: (zoom: number) => void;
  workerId: string;
  style?: any;

  // GeoJSON props that will be passed down
  assignmentPointsGeoJSON: FeatureCollection<Point>;
  assignmentSegmentsGeoJSON: FeatureCollection<LineString>;
  fullTrailGeoJSON: FeatureCollection<LineString>;
  trackingDotsGeoJSON: FeatureCollection<Point>;
}

const DailyWorkerMapNative: React.FC<DailyWorkerMapProps> = (props) => {
  const {
    assignments,
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
      const props = feature.properties;
      
      const start = moment(props?.startTime);
      const end = moment(props?.endTime);
      const duration = moment.duration(end.diff(start));
      const hours = Math.floor(duration.asHours());
      const minutes = duration.minutes();

      return {
        latitude: coordinates[1],
        longitude: coordinates[0],
        title: props?.name || '',
        address: props?.address || '',
        startTime: start.format('HH:mm'),
        endTime: end.format('HH:mm'),
        duration: `${hours}h ${minutes}m`,
        id: props?.id || '',
        assignmentOrder: props?.assignmentOrder || 0,
      };
    }).sort((a,b) => a.assignmentOrder - b.assignmentOrder);
  }, [assignmentPointsGeoJSON]);

  return (
    <View style={StyleSheet.flatten([styles.mapContainer, style])}>
      <MapView
        style={styles.map}
        initialRegion={region}
        region={region}
      >
        {/* Render full trail */}
        {trailCoordinates.length > 1 && (
          <Polyline
            coordinates={trailCoordinates}
            strokeColor="#888888"
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
            strokeColor={theme.colors.primary}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
            zIndex={2}
          />
        ))}

        {/* Render assignment points */}
        {assignmentMarkers.map((marker) => (
          <Marker
            key={`${marker.id}-${marker.assignmentOrder}`}
            coordinate={marker}
            zIndex={3}
          >
            <View style={styles.assignmentMarker}>
              <Text style={styles.assignmentMarkerText} fontType="bold">{marker.assignmentOrder}</Text>
            </View>
            <Callout tooltip>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle} fontType="bold">{marker.title}</Text>
                {marker.address ? <Text style={styles.calloutAddress} fontType="regular">{marker.address}</Text> : null}
                <View style={styles.calloutDivider} />
                <View style={styles.calloutRow}>
                  <Text style={styles.calloutLabel} fontType="medium">Entered: </Text>
                  <Text style={styles.calloutValue} fontType="regular">{marker.startTime}</Text>
                </View>
                <View style={styles.calloutRow}>
                  <Text style={styles.calloutLabel} fontType="medium">Exited: </Text>
                  <Text style={styles.calloutValue} fontType="regular">{marker.endTime}</Text>
                </View>
                <View style={[styles.calloutRow, {marginTop: 4}]}>
                  <Text style={styles.calloutLabel} fontType="medium">Total Time: </Text>
                  <Text style={[styles.calloutValue, {color: theme.colors.primary}]} fontType="bold">{marker.duration}</Text>
                </View>
              </View>
            </Callout>
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
    backgroundColor: theme.colors.success,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  assignmentMarkerText: {
    color: '#ffffff',
    fontSize: 12,
  },
  calloutContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    width: 200,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  calloutTitle: {
    fontSize: 14,
    color: theme.colors.headingText,
    marginBottom: 2,
  },
  calloutAddress: {
    fontSize: 11,
    color: theme.colors.bodyText,
    marginBottom: 8,
  },
  calloutDivider: {
    height: 1,
    backgroundColor: theme.colors.borderColor,
    marginBottom: 8,
  },
  calloutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  calloutLabel: {
    fontSize: 11,
    color: theme.colors.bodyText,
  },
  calloutValue: {
    fontSize: 11,
    color: theme.colors.headingText,
  },
});

export default DailyWorkerMapNative;
