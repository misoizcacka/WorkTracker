/**
 * MapPreview.web.tsx
 * A lightweight MapLibre map used in modals to preview a location
 * with an accurately-scaled check-in radius circle.
 */
import React, { useEffect, useRef } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';

const TILE_STYLE = 'https://data.lfmaps.fr/styles/bright';

// Build an accurate GeoJSON circle polygon from centre + radius in metres.
function makeCircleGeoJSON(lng: number, lat: number, radiusMeters: number, steps = 64) {
  const earthRadius = 6371000;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dLat = (radiusMeters / earthRadius) * (180 / Math.PI);
    const dLng = dLat / Math.cos((lat * Math.PI) / 180);
    coords.push([lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)]);
  }
  return {
    type: 'Feature' as const,
    geometry: { type: 'Polygon' as const, coordinates: [coords] },
    properties: {},
  };
}

// MapLibre uses 512px tiles: metres_per_pixel = 78271 * cos(lat) / 2^z
// Target: circle diameter spans ~40% of ~450px container (180px total, 90px per side)
// → z = log2(78271 * cos(lat) * 90 / radius)
function calcZoom(latitude: number, radiusMeters: number): number {
  const cos = Math.cos((latitude * Math.PI) / 180);
  return Math.max(10, Math.min(17, Math.log2((78271 * cos * 90) / radiusMeters)));
}

interface MapPreviewProps {
  latitude: number;
  longitude: number;
  /** Radius in metres — renders an accurate circle and adjusts zoom. */
  radius?: number;
  height?: number;
}

export const MapPreview: React.FC<MapPreviewProps> = ({
  latitude,
  longitude,
  radius,
  height = 150,
}) => {
  const mapRef = useRef<any>(null);
  const initialZoom = radius ? calcZoom(latitude, radius) : 14;

  // Re-zoom smoothly whenever the radius slider moves
  useEffect(() => {
    if (!mapRef.current || !radius) return;
    mapRef.current.easeTo({
      zoom: calcZoom(latitude, radius),
      duration: 250,
    });
  }, [radius, latitude, longitude]);

  const circleData = radius
    ? makeCircleGeoJSON(longitude, latitude, radius)
    : null;

  return (
    <View style={[styles.container, { height }]}>
      <Map
        ref={mapRef}
        initialViewState={{ latitude, longitude, zoom: initialZoom }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={TILE_STYLE as any}
        attributionControl={false}
        scrollZoom={false}
        dragPan={false}
        dragRotate={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
        keyboard={false}
      >
        {/* Centre pin */}
        <Marker latitude={latitude} longitude={longitude}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: theme.colors.primary,
            border: '2px solid white',
            boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
          }} />
        </Marker>

        {/* Accurate radius circle */}
        {circleData && (
          <Source id="radius-circle" type="geojson" data={circleData}>
            <Layer
              id="radius-fill"
              type="fill"
              paint={{ 'fill-color': theme.colors.primary, 'fill-opacity': 0.12 }}
            />
            <Layer
              id="radius-stroke"
              type="line"
              paint={{ 'line-color': theme.colors.primary, 'line-width': 2, 'line-opacity': 0.7 }}
            />
          </Source>
        )}
      </Map>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
});
