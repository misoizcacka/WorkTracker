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
  layout: {
    'line-cap': 'round',
    'line-join': 'round',
  },
  paint: {
    'line-color': ['get', 'color'], // Use color from properties
    'line-width': 6,
    'line-opacity': 0.85,
  },
};

// Add a subtle outer glow to the trail
const fullTrailGlowStyle: LineLayerSpecification = {
  id: 'full-trail-glow-layer',
  type: 'line',
  source: 'full-trail-source',
  layout: {
    'line-cap': 'round',
    'line-join': 'round',
  },
  paint: {
    'line-color': ['get', 'color'],
    'line-width': 10,
    'line-opacity': 0.2,
    'line-blur': 4,
  },
};

const assignmentSegmentsLayerStyle: LineLayerSpecification = {
  id: 'assignment-segments-layer',
  type: 'line',
  source: 'assignment-segments-source',
  layout: {
    'line-cap': 'round',
    'line-join': 'round',
  },
  paint: {
    'line-color': theme.colors.primary,
    'line-width': 8, // Thicker for emphasis
    'line-opacity': 1,
  },
};

const trackingDotsLayerStyle: CircleLayerSpecification = {
  id: 'tracking-dots-layer',
  type: 'circle',
  source: 'tracking-dots-source',
  paint: {
    'circle-radius': 3, // Larger
    'circle-color': '#4B5563', // Darker gray for visibility
    'circle-opacity': 0.6, // More visible
    'circle-stroke-width': 1,
    'circle-stroke-color': '#ffffff',
    'circle-stroke-opacity': 0.8,
  },
};

const TILE_PROVIDER_STYLE = 'https://data.lfmaps.fr/styles/bright';

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
  
  // Compute initial center from first location in trail
  const computedInitialRegion = useMemo(() => {
    // Try to get first coordinate from fullTrail
    if (fullTrailGeoJSON.features.length > 0) {
      const firstFeature = fullTrailGeoJSON.features[0];
      if (firstFeature.geometry.type === 'LineString' && firstFeature.geometry.coordinates.length > 0) {
        const [lng, lat] = firstFeature.geometry.coordinates[0];
        return { longitude: lng, latitude: lat, zoom: 15 }; // Increased from 13 to 15
      }
    }
    // Fallback to assignment points
    if (assignmentPointsGeoJSON.features.length > 0) {
      const firstPoint = assignmentPointsGeoJSON.features[0];
      if (firstPoint.geometry.type === 'Point') {
        const [lng, lat] = firstPoint.geometry.coordinates;
        return { longitude: lng, latitude: lat, zoom: 15 }; // Increased from 13 to 15
      }
    }
    // Last resort: London (should never happen if there's location data)
    return { longitude: -0.1278, latitude: 51.5074, zoom: 12 };
  }, [fullTrailGeoJSON, assignmentPointsGeoJSON]);

  const [viewState, setViewState] = useState<ViewState>({
    longitude: region?.longitude || initialRegion?.longitude || computedInitialRegion.longitude,
    latitude: region?.latitude || initialRegion?.latitude || computedInitialRegion.latitude,
    zoom: zoom || region?.zoom || initialRegion?.zoom || computedInitialRegion.zoom,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 }
  });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hoveredSiteId, setHoveredSiteId] = useState<string | null>(null);
  const [legendExpanded, setLegendExpanded] = useState(false);

  // Get start and end points from trail
  const startPoint = useMemo(() => {
    if (fullTrailGeoJSON.features.length > 0) {
      const firstFeature = fullTrailGeoJSON.features[0];
      if (firstFeature.geometry.type === 'LineString' && firstFeature.geometry.coordinates.length > 0) {
        const [lng, lat] = firstFeature.geometry.coordinates[0];
        return { lng, lat };
      }
    }
    return null;
  }, [fullTrailGeoJSON]);

  const endPoint = useMemo(() => {
    if (fullTrailGeoJSON.features.length > 0) {
      const lastFeature = fullTrailGeoJSON.features[fullTrailGeoJSON.features.length - 1];
      if (lastFeature.geometry.type === 'LineString' && lastFeature.geometry.coordinates.length > 0) {
        const coords = lastFeature.geometry.coordinates;
        const [lng, lat] = coords[coords.length - 1];
        return { lng, lat };
      }
    }
    return null;
  }, [fullTrailGeoJSON]);

  // Check if start and end points are very close (within ~50 meters)
  const startEndOverlap = useMemo(() => {
    if (!startPoint || !endPoint) return false;
    const R = 6371000; // Earth radius in meters
    const dLat = (endPoint.lat - startPoint.lat) * Math.PI / 180;
    const dLng = (endPoint.lng - startPoint.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(startPoint.lat * Math.PI / 180) * Math.cos(endPoint.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance < 50; // Less than 50 meters
  }, [startPoint, endPoint]);

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
      mapRef.current.getMap().fitBounds(bounds, { padding: 80, duration: 1000 }); // Reduced padding from 200 to 80
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
      {/* Legend - Collapsible */}
      <View style={styles.legend}>
        <View 
          style={styles.legendHeader}
          onMouseEnter={() => setLegendExpanded(true)}
          onMouseLeave={() => setLegendExpanded(false)}
        >
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <Text style={styles.legendTitle} fontType="regular">Legend</Text>
          <Ionicons 
            name={legendExpanded ? "chevron-up" : "chevron-down"} 
            size={16} 
            color={theme.colors.bodyText} 
          />
        </View>
        
        {legendExpanded && (
          <View style={styles.legendContent}>
            <View style={styles.legendItem}>
              <View style={styles.startMarkerLegend}>
                <Ionicons name="play" size={10} color="white" />
              </View>
              <Text style={styles.legendText}>Start Point</Text>
            </View>
            
            <View style={styles.legendItem}>
              <View style={styles.endMarkerLegend}>
                <Ionicons name="flag" size={10} color="white" />
              </View>
              <Text style={styles.legendText}>End Point</Text>
            </View>
            
            <View style={styles.legendItem}>
              <View style={styles.suitcaseMarkerLegend}>
                <Ionicons name="briefcase" size={10} color="white" />
              </View>
              <Text style={styles.legendText}>Project Site (hover for details)</Text>
            </View>
            
            <View style={styles.legendItem}>
              <View style={[styles.trailLine, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.legendText}>Travel Path</Text>
            </View>
            
            <View style={styles.legendItem}>
              <View style={styles.trackingDot} />
              <Text style={styles.legendText}>GPS Tracking Point</Text>
            </View>
          </View>
        )}
      </View>

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
            {/* Outer glow */}
            <Layer {...fullTrailGlowStyle} />
            {/* Main trail */}
            <Layer {...fullTrailLayerStyle} />
            {/* Animated dashed line for direction */}
            <Layer
              id="trail-direction"
              type="line"
              layout={{
                'line-cap': 'round',
                'line-join': 'round',
              }}
              paint={{
                'line-color': '#FFFFFF',
                'line-width': 2,
                'line-opacity': 0.6,
                'line-dasharray': [0, 2, 2], // Creates dots along the line
              }}
            />
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

        {/* Project Markers with Suitcase Icon - Lower z-index */}
        {assignments && assignments.map((site, idx) => (
          <Marker
            key={`marker-${site.id}-${idx}`}
            longitude={site.lng}
            latitude={site.lat}
            anchor="center"
            style={{ zIndex: 1 }}
          >
            <View 
              style={[
                styles.suitcaseMarker,
                hoveredSiteId === `${site.id}-${idx}` && styles.suitcaseMarkerHover
              ]}
              onMouseEnter={() => setHoveredSiteId(`${site.id}-${idx}`)}
              onMouseLeave={() => setHoveredSiteId(null)}
            >
              <Ionicons name="briefcase" size={18} color="white" />
            </View>
          </Marker>
        ))}

        {/* Start Point Marker - High z-index */}
        {startPoint && (
          <Marker 
            longitude={startPoint.lng} 
            latitude={startPoint.lat} 
            anchor={startEndOverlap ? "bottom-left" : "center"}
            offset={startEndOverlap ? [-10, -10] : [0, 0]}
            style={{ zIndex: 100 }}
          >
            <View style={styles.startMarker}>
              <Ionicons name="play" size={16} color="white" />
              <Text style={styles.markerLabel} fontType="bold">START</Text>
            </View>
          </Marker>
        )}

        {/* End Point Marker - High z-index */}
        {endPoint && (
          <Marker 
            longitude={endPoint.lng} 
            latitude={endPoint.lat} 
            anchor={startEndOverlap ? "top-right" : "center"}
            offset={startEndOverlap ? [10, 10] : [0, 0]}
            style={{ zIndex: 99 }}
          >
            <View style={styles.endMarker}>
              <Ionicons name="flag" size={16} color="white" />
              <Text style={styles.markerLabel} fontType="bold">END</Text>
            </View>
          </Marker>
        )}

        {/* Hover Popups for project sites */}
        {hoveredSiteId && assignments && assignments.map((site, idx) => {
          if (hoveredSiteId !== `${site.id}-${idx}`) return null;
          
          const duration = site.totalDurationMinutes || 0;
          const durationStr = `${Math.floor(duration / 60)}h ${duration % 60}m`;
          
          return (
            <Popup
              key={`popup-${site.id}-${idx}`}
              longitude={site.lng}
              latitude={site.lat}
              anchor="top"
              closeButton={false}
              closeOnClick={false}
              offset={20}
              maxWidth="280px"
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
    position: 'relative',
  },
  legend: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.75)', // More transparent (75% instead of 85%)
    backdropFilter: 'blur(8px)',
    borderRadius: theme.radius.md,
    zIndex: 10,
    minWidth: 60,
    maxWidth: 240,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
    cursor: 'pointer',
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
  },
  legendTitle: {
    fontSize: 12,
    color: theme.colors.headingText,
    flex: 1,
  },
  legendContent: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    paddingTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendText: {
    fontSize: 10,
    color: theme.colors.bodyText,
    marginLeft: 8,
  },
  startMarker: {
    backgroundColor: '#10B981', // Green
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'white',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.6)',
    gap: 4,
  },
  startMarkerLegend: {
    backgroundColor: '#10B981',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  endMarker: {
    backgroundColor: '#EF4444', // Red
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'white',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.6)',
    gap: 4,
  },
  endMarkerLegend: {
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  markerLabel: {
    color: '#ffffff',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suitcaseMarker: {
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  suitcaseMarkerHover: {
    transform: [{ scale: 1.2 }],
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  },
  suitcaseMarkerLegend: {
    backgroundColor: theme.colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  trailLine: {
    width: 24,
    height: 4,
    borderRadius: 2,
  },
  trackingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4B5563',
    borderWidth: 1,
    borderColor: 'white',
  },
  card: {
    backgroundColor: 'white',
    padding: 10,
    minWidth: 200,
  },
  cardTitle: {
    fontSize: 14,
    color: theme.colors.headingText,
    marginBottom: 2,
  },
  cardAddress: {
    fontSize: 11,
    color: theme.colors.bodyText,
    marginBottom: 8,
  },
  cardDivider: {
    height: 1,
    backgroundColor: theme.colors.borderColor,
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  visitRow: {
    marginBottom: 6,
  },
  visitDivider: {
    height: 1,
    backgroundColor: theme.colors.borderColor,
    opacity: 0.5,
    marginVertical: 6,
    borderStyle: 'dashed',
  },
  cardLabel: {
    fontSize: 11,
    color: theme.colors.bodyText,
  },
  cardValue: {
    fontSize: 11,
    color: theme.colors.headingText,
  },
});
