import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import Map, { Source, Layer, NavigationControl, ViewStateChangeEvent, MapRef, ViewState } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css'; // Re-introducing the essential CSS import
import maplibregl, { LngLatBounds } from 'maplibre-gl'; // Keep for LngLatBounds for fitBounds
import { View, StyleSheet } from 'react-native'; // Import View and StyleSheet
import { theme } from '../theme'; // Import theme

import { FeatureCollection, Point, LineString } from 'geojson';
import { DailyWorkerMapProps } from './DailyWorkerMap.native'; // Import from the native type file
import { LineLayerSpecification, CircleLayerSpecification, SymbolLayerSpecification } from '@maplibre/maplibre-gl-style-spec'; // Import specific layer types

// Define layer styles for consistency and reusability
const fullTrailLayerStyle: LineLayerSpecification = {
  id: 'full-trail-layer',
  type: 'line',
  source: 'full-trail-source', // Added source property
  paint: {
    'line-color': '#888888', // Dark gray
    'line-width': 2,
    'line-opacity': 0.5, // Semi-transparent
  },
};

const assignmentSegmentsLayerStyle: LineLayerSpecification = {
  id: 'assignment-segments-layer',
  type: 'line',
  source: 'assignment-segments-source', // Added source property
  paint: {
    'line-color': '#007bff', // Blue
    'line-width': 4,
    'line-opacity': 0.8, // Slightly darker
  },
};

const pointsCircleLayerStyle: CircleLayerSpecification = {
  id: 'assignment-points-circle-layer',
  type: 'circle',
  source: 'assignment-points-source', // Added source property
  paint: {
    'circle-radius': 8,
    'circle-color': '#000000', // Black
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff', // White stroke
  },
};

const pointsNumberLayerStyle: SymbolLayerSpecification = {
  id: 'assignment-points-number-layer',
  type: 'symbol',
  source: 'assignment-points-source', // Added source property
  layout: {
    'text-field': 'X', // Temporarily display a static 'X' for debugging
    'text-font': ['Roboto Medium', 'Arial Unicode MS Regular'], // Simpler, more common fonts
    'text-size': 12,
    'text-offset': [0, 0], // Center number over icon
    'text-anchor': 'center',
    'text-allow-overlap': true, // Allow numbers to overlap
  },
  paint: {
    'text-color': '#FFFF00', // Bright Yellow
    // 'text-halo-color': '#000000', // Black halo for readability
    // 'text-halo-width': 1,
  },
};

const TILE_PROVIDER_STYLE = 'https://tiles.stadiamaps.com/styles/osm_bright.json'; // Placeholder, use the same as MapView.web.tsx if possible

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
  workerId, // This prop is not used in the map rendering logic for now.
  style,
}) => {
  const mapRef = useRef<MapRef | null>(null);
  const [viewState, setViewState] = useState<ViewState>({
    longitude: region?.longitude || initialRegion?.longitude || -0.1278, // London default
    latitude: region?.latitude || initialRegion?.latitude || 51.5074,
    zoom: zoom || region?.zoom || initialRegion?.zoom || 12,
    bearing: 0,
    pitch: 0,
    padding: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    }
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

  return (
    <View // Changed from div to View
      style={[styles.mapContainer, style]} // Apply StyleSheet styles
    >
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
            <Layer {...assignmentSegmentsLayerStyle} beforeId={fullTrailLayerStyle.id} />
          </Source>
        )}

        {/* Assignment Points Source and Layers */}
        {assignmentPointsGeoJSON && (
          <Source id="assignment-points-source" type="geojson" data={assignmentPointsGeoJSON}>
            <Layer {...pointsCircleLayerStyle} beforeId={assignmentSegmentsLayerStyle.id} />
            <Layer {...pointsNumberLayerStyle} beforeId={pointsCircleLayerStyle.id} />
          </Source>
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
});