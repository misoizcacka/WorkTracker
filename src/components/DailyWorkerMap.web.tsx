import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import Map, { Source, Layer, NavigationControl, ViewStateChangeEvent, MapRef, ViewState, Popup, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { Text } from './Themed';
import moment from 'moment';
import { Ionicons } from '@expo/vector-icons';

import { FeatureCollection, Point, LineString } from 'geojson';
import { DailyWorkerMapProps } from './DailyWorkerMap.native';
import { LineLayerSpecification, CircleLayerSpecification } from '@maplibre/maplibre-gl-style-spec';

// Define layer styles for consistency and reusability
const fullTrailLayerStyle: LineLayerSpecification = {
  id: 'full-trail-layer',
  type: 'line',
  source: 'full-trail-source',
  paint: {
    'line-color': '#888888',
    'line-width': 2,
    'line-opacity': 0.5,
  },
};

const assignmentSegmentsLayerStyle: LineLayerSpecification = {
  id: 'assignment-segments-layer',
  type: 'line',
  source: 'assignment-segments-source',
  paint: {
    'line-color': theme.colors.primary,
    'line-width': 4,
    'line-opacity': 0.8,
  },
};

const trackingDotsLayerStyle: CircleLayerSpecification = {
  id: 'tracking-dots-layer',
  type: 'circle',
  source: 'tracking-dots-source',
  paint: {
    'circle-radius': 3,
    'circle-color': theme.colors.secondary,
    'circle-opacity': 0.6,
    'circle-stroke-width': 1,
    'circle-stroke-color': '#ffffff',
  },
};

const TILE_PROVIDER_STYLE = 'https://tiles.stadiamaps.com/styles/osm_bright.json';

const DailyWorkerMapWeb: React.FC<DailyWorkerMapProps & {
  assignmentPointsGeoJSON: FeatureCollection<Point>;
  assignmentSegmentsGeoJSON: FeatureCollection<LineString>;
  fullTrailGeoJSON: FeatureCollection<LineString>;
  trackingDotsGeoJSON: FeatureCollection<Point>;
}> = ({
  assignmentPointsGeoJSON,
  assignmentSegmentsGeoJSON,
  fullTrailGeoJSON,
  trackingDotsGeoJSON,
  assignments,
  initialRegion,
  region,
  zoom,
  onWebZoomChange,
  workerId,
  style,
}) => {
  const mapRef = useRef<MapRef | null>(null);
  const [viewState, setViewState] = useState<ViewState>({
    longitude: region?.longitude || initialRegion?.longitude || -0.1278,
    latitude: region?.latitude || initialRegion?.latitude || 51.5074,
    zoom: zoom || region?.zoom || initialRegion?.zoom || 12,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 }
  });
  const [mapLoaded, setMapLoaded] = useState(false);

  // Update viewState when region or zoom props change
  useEffect(() => {
    setViewState(prev => {
      const newLongitude = region?.longitude || initialRegion?.longitude || prev.longitude;
      const newLatitude = region?.latitude || initialRegion?.latitude || prev.latitude;
      const newZoom = zoom || region?.zoom || initialRegion?.zoom || prev.zoom;

      if (
        newLongitude !== prev.longitude ||
        newLatitude !== prev.latitude ||
        newZoom !== prev.zoom
      ) {
        return {
          ...prev,
          longitude: newLongitude,
          latitude: newLatitude,
          zoom: newZoom,
        };
      }
      return prev;
    });
  }, [region, initialRegion, zoom]);

  const onMapLoad = useCallback(() => {
    setMapLoaded(true);
    fitMapToBounds();
  }, [assignmentPointsGeoJSON, assignmentSegmentsGeoJSON, fullTrailGeoJSON, trackingDotsGeoJSON]);

  const fitMapToBounds = useCallback(() => {
    if (!mapRef.current || !mapLoaded) return;

    const allCoords: [number, number][] = [];

    if (fullTrailGeoJSON?.features) {
      fullTrailGeoJSON.features.forEach(feature => {
        if (feature.geometry.type === 'LineString') {
          allCoords.push(...(feature.geometry.coordinates as [number, number][]));
        }
      });
    }
    
    if (assignmentPointsGeoJSON?.features) {
      assignmentPointsGeoJSON.features.forEach(feature => {
        allCoords.push(feature.geometry.coordinates as [number, number]);
      });
    }

    if (trackingDotsGeoJSON?.features) {
      trackingDotsGeoJSON.features.forEach(feature => {
        allCoords.push(feature.geometry.coordinates as [number, number]);
      });
    }

    if (allCoords.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      allCoords.forEach(coord => bounds.extend(coord));
      mapRef.current.getMap().fitBounds(bounds, { padding: 200, duration: 1000 });
    }
  }, [mapLoaded, assignmentPointsGeoJSON, fullTrailGeoJSON, trackingDotsGeoJSON]);

  useEffect(() => {
    if (mapLoaded) {
      fitMapToBounds();
    }
  }, [fitMapToBounds, mapLoaded]);


  const onMove = useCallback((evt: ViewStateChangeEvent) => {
    const { viewState: newViewState } = evt;
    setViewState({
      ...newViewState,
      padding: {
        top: newViewState.padding?.top ?? 0,
        bottom: newViewState.padding?.bottom ?? 0,
        left: newViewState.padding?.left ?? 0,
        right: newViewState.padding?.right ?? 0,
      },
    });
    if (onWebZoomChange) {
      onWebZoomChange(newViewState.zoom);
    }
  }, [onWebZoomChange]);

  return (
    <View style={[styles.mapContainer, style]}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={onMove}
        onLoad={onMapLoad}
        style={{ width: '100%', height: '100%' }}
        mapStyle={TILE_PROVIDER_STYLE}
        attributionControl={false}
      >
        <NavigationControl visualizePitch={true} showZoom={true} showCompass={false} position="top-right" />

        {/* Full Trail Source and Layer */}
        {fullTrailGeoJSON && (
          <Source id="full-trail-source" type="geojson" data={fullTrailGeoJSON}>
            <Layer {...fullTrailLayerStyle} />
          </Source>
        )}

        {/* Assignment Segments Source and Layer */}
        {assignmentSegmentsGeoJSON && (
          <Source id="assignment-segments-source" type="geojson" data={assignmentSegmentsGeoJSON}>
            <Layer {...assignmentSegmentsLayerStyle} />
          </Source>
        )}

        {/* Tracking Dots Source and Layer */}
        {trackingDotsGeoJSON && (
          <Source id="tracking-dots-source" type="geojson" data={trackingDotsGeoJSON}>
            <Layer {...trackingDotsLayerStyle} />
          </Source>
        )}

        {/* Project Markers with Suitcase Icon */}
        {assignments && assignments.map((site, idx) => (
          <Marker
            key={`marker-${site.id}-${idx}`}
            longitude={site.lng}
            latitude={site.lat}
            anchor="center"
          >
            <View style={styles.suitcaseMarker}>
              <Ionicons name="briefcase" size={18} color="white" />
            </View>
          </Marker>
        ))}

        {/* Permanent Popups for all project sites */}
        {assignments && assignments.map((site, idx) => {
          const duration = site.totalDurationMinutes || 0;
          const durationStr = `${Math.floor(duration / 60)}h ${duration % 60}m`;
          
          return (
            <Popup
              key={`${site.id}-${idx}`}
              longitude={site.lng}
              latitude={site.lat}
              anchor="bottom"
              closeButton={false}
              closeOnClick={false}
              offset={10}
              maxWidth="240px"
            >
              <View style={styles.card}>
                <Text style={styles.cardTitle} fontType="bold">{site.name}</Text>
                <Text style={styles.cardAddress} numberOfLines={1}>{site.address}</Text>
                
                <View style={styles.cardDivider} />
                
                {site.visits?.map((visit: any, vIdx: number) => (
                  <View key={vIdx} style={styles.visitRow}>
                    <View style={styles.cardRow}>
                      <Text style={styles.cardLabel}>Entered:</Text>
                      <Text style={styles.cardValue}>{moment(visit.startTime).format('hh:mm A')}</Text>
                    </View>
                    <View style={styles.cardRow}>
                      <Text style={styles.cardLabel}>Exited:</Text>
                      <Text style={styles.cardValue}>
                        {visit.isStillThere ? 'N/A' : moment(visit.endTime).format('hh:mm A')}
                      </Text>
                    </View>
                    {site.visits && vIdx < site.visits.length - 1 && <View style={styles.visitDivider} />}
                  </View>
                ))}
                
                <View style={styles.cardDivider} />
                
                <View style={[styles.cardRow, { marginTop: 2 }]}>
                  <Text style={[styles.cardLabel, { fontWeight: 'bold' }]}>Total Time:</Text>
                  <Text style={[styles.cardValue, { color: theme.colors.primary }]} fontType="bold">
                    {durationStr}
                  </Text>
                </View>
              </View>
            </Popup>
          );
        })}
      </Map>
    </View>
  );
};

export default DailyWorkerMapWeb;

// --- STYLES ---
const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  suitcaseMarker: {
    backgroundColor: theme.colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    // We use standard web shadow for markers on web
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  card: {
    backgroundColor: 'white',
    padding: 8,
    minWidth: 160,
  },
  cardTitle: {
    fontSize: 13,
    color: theme.colors.headingText,
    marginBottom: 2,
  },
  cardAddress: {
    fontSize: 10,
    color: theme.colors.bodyText,
    marginBottom: 6,
  },
  cardDivider: {
    height: 1,
    backgroundColor: theme.colors.borderColor,
    marginBottom: 6,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  visitRow: {
    marginBottom: 4,
  },
  visitDivider: {
    height: 1,
    backgroundColor: theme.colors.borderColor,
    opacity: 0.5,
    marginVertical: 4,
    borderStyle: 'dashed',
  },
  cardLabel: {
    fontSize: 10,
    color: theme.colors.bodyText,
  },
  cardValue: {
    fontSize: 10,
    color: theme.colors.headingText,
  },
});
