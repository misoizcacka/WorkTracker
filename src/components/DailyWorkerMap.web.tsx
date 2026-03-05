import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import Map, { Source, Layer, NavigationControl, ViewStateChangeEvent, MapRef, ViewState, Popup } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { Text } from './Themed';
import moment from 'moment';

import { FeatureCollection, Point, LineString } from 'geojson';
import { DailyWorkerMapProps } from './DailyWorkerMap.native';
import { LineLayerSpecification, CircleLayerSpecification, SymbolLayerSpecification } from '@maplibre/maplibre-gl-style-spec';

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

const pointsCircleLayerStyle: CircleLayerSpecification = {
  id: 'assignment-points-circle-layer',
  type: 'circle',
  source: 'assignment-points-source',
  paint: {
    'circle-radius': 12,
    'circle-color': theme.colors.success,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
  },
};

const pointsNumberLayerStyle: SymbolLayerSpecification = {
  id: 'assignment-points-number-layer',
  type: 'symbol',
  source: 'assignment-points-source',
  layout: {
    'text-field': ['get', 'assignmentOrder'],
    'text-font': ['Roboto Medium', 'Arial Unicode MS Regular'],
    'text-size': 12,
    'text-anchor': 'center',
    'text-allow-overlap': true,
  },
  paint: {
    'text-color': '#ffffff',
  },
};

const TILE_PROVIDER_STYLE = 'https://tiles.stadiamaps.com/styles/osm_bright.json';

const DailyWorkerMapWeb: React.FC<DailyWorkerMapProps & {
  assignmentPointsGeoJSON: FeatureCollection<Point>;
  assignmentSegmentsGeoJSON: FeatureCollection<LineString>;
  fullTrailGeoJSON: FeatureCollection<LineString>;
}> = ({
  assignmentPointsGeoJSON,
  assignmentSegmentsGeoJSON,
  fullTrailGeoJSON,
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
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);

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
    // Fit to bounds initially if data is available
    fitMapToBounds();
  }, [assignmentPointsGeoJSON, assignmentSegmentsGeoJSON, fullTrailGeoJSON]); // Depend on geojson data for initial fitBounds

  // Effect to fit map to bounds when GeoJSON data changes or map loads
  const fitMapToBounds = useCallback(() => {
    if (!mapRef.current || !mapLoaded) return;

    const allCoords: [number, number][] = [];

    fullTrailGeoJSON.features.forEach(feature => {
      if (feature.geometry.type === 'LineString') {
        allCoords.push(...(feature.geometry.coordinates as [number, number][]));
      }
    });
    assignmentPointsGeoJSON.features.forEach(feature => {
      allCoords.push(feature.geometry.coordinates as [number, number]);
    });
    assignmentSegmentsGeoJSON.features.forEach(feature => {
      if (feature.geometry.type === 'LineString') {
        allCoords.push(...(feature.geometry.coordinates as [number, number][]));
      }
    });

    if (allCoords.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      allCoords.forEach(coord => bounds.extend(coord));
      mapRef.current.getMap().fitBounds(bounds, { padding: 50, duration: 0 });
    }
  }, [mapRef, mapLoaded, assignmentPointsGeoJSON, assignmentSegmentsGeoJSON, fullTrailGeoJSON]);

  useEffect(() => {
    fitMapToBounds();
  }, [fitMapToBounds]);


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

  const onMapClick = useCallback((event: any) => {
    const feature = event.features && event.features[0];
    if (feature && feature.layer.id === 'assignment-points-circle-layer') {
      setSelectedAssignment({
        longitude: feature.geometry.coordinates[0],
        latitude: feature.geometry.coordinates[1],
        ...feature.properties
      });
    } else {
      setSelectedAssignment(null);
    }
  }, []);

  const assignmentMarkers = useMemo(() => {
    if (!assignmentPointsGeoJSON || assignmentPointsGeoJSON.features.length === 0) return [];
    return assignmentPointsGeoJSON.features.map(feature => {
      const props = feature.properties;
      const start = moment(props?.startTime);
      const end = moment(props?.endTime);
      const duration = moment.duration(end.diff(start));
      const hours = Math.floor(duration.asHours());
      const minutes = duration.minutes();

      return {
        longitude: feature.geometry.coordinates[0],
        latitude: feature.geometry.coordinates[1],
        title: props?.name || '',
        address: props?.address || '',
        startTime: start.format('HH:mm'),
        endTime: end.format('HH:mm'),
        duration: `${hours}h ${minutes}m`,
        assignmentOrder: props?.assignmentOrder || 0,
      };
    });
  }, [assignmentPointsGeoJSON]);

  return (
    <View style={[styles.mapContainer, style]}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={onMove}
        onLoad={onMapLoad}
        onClick={onMapClick}
        interactiveLayerIds={['assignment-points-circle-layer']}
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

        {/* Assignment Points Source and Layers */}
        {assignmentPointsGeoJSON && (
          <Source id="assignment-points-source" type="geojson" data={assignmentPointsGeoJSON}>
            <Layer {...pointsCircleLayerStyle} />
            <Layer {...pointsNumberLayerStyle} />
          </Source>
        )}

        {selectedAssignment && (
          <Popup
            longitude={selectedAssignment.longitude}
            latitude={selectedAssignment.latitude}
            anchor="bottom"
            onClose={() => setSelectedAssignment(null)}
            closeButton={false}
            className="assignment-popup"
          >
            <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle} fontType="bold">{selectedAssignment.name}</Text>
                {selectedAssignment.address ? <Text style={styles.calloutAddress} fontType="regular">{selectedAssignment.address}</Text> : null}
                <View style={styles.calloutDivider} />
                <View style={styles.calloutRow}>
                  <Text style={styles.calloutLabel} fontType="medium">Entered: </Text>
                  <Text style={styles.calloutValue} fontType="regular">{moment(selectedAssignment.startTime).format('HH:mm')}</Text>
                </View>
                <View style={styles.calloutRow}>
                  <Text style={styles.calloutLabel} fontType="medium">Exited: </Text>
                  <Text style={styles.calloutValue} fontType="regular">{moment(selectedAssignment.endTime).format('HH:mm')}</Text>
                </View>
                <View style={[styles.calloutRow, {marginTop: 4}]}>
                  <Text style={styles.calloutLabel} fontType="medium">Total Time: </Text>
                  <Text style={[styles.calloutValue, {color: theme.colors.primary}]} fontType="bold">
                    {(() => {
                        const start = moment(selectedAssignment.startTime);
                        const end = moment(selectedAssignment.endTime);
                        const duration = moment.duration(end.diff(start));
                        return `${Math.floor(duration.asHours())}h ${duration.minutes()}m`;
                    })()}
                  </Text>
                </View>
              </View>
          </Popup>
        )}
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
    margin: theme.spacing(2),
  },
  calloutContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    width: 200,
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
    width: '100%',
  },
  calloutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
    width: '100%',
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