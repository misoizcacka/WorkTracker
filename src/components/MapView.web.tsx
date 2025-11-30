import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import Map, { Marker as MapLibreMarker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { View, Image, StyleSheet, Text, ImageStyle } from 'react-native';
import { theme } from '../theme';
 import maplibregl, { LngLatBounds } from 'maplibre-gl';import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Supercluster from 'supercluster';
import { Button } from './Button';
import moment from 'moment';
import { WorkerLocation, ProjectLocation, ItemInCluster } from './map-types';

const TILE_PROVIDER_STYLE = 'https://tiles.stadiamaps.com/styles/osm_bright.json';

interface MapViewProps {
  selectedWorkers?: WorkerLocation[];
  selectedProjects?: ProjectLocation[];
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
    zoom?: number;
  };
  showNameTag?: boolean;
}

// --- MARKERS ---
const ModernWorkerMarker = ({ marker, showNameTag = true }: { marker: WorkerLocation; showNameTag?: boolean }) => (
  <View style={styles.markerContainer}>
    <View style={[styles.markerBase, styles.workerMarker]}>
      {marker.avatar ? (
        <Image source={{ uri: marker.avatar }} style={[styles.avatar] as ImageStyle} />
      ) : (
        <FontAwesome5 name="hard-hat" size={20} color="white" />
      )}
    </View>
    {showNameTag && <Text style={styles.nameTag}>{marker.name}</Text>}
  </View>
);

const ModernProjectMarker = ({ marker, showNameTag = true }: { marker: ProjectLocation; showNameTag?: boolean }) => (
  <View style={styles.markerContainer}>
    <View style={[styles.markerBase, { backgroundColor: marker.color || theme.colors.secondary }]}>
      <Ionicons name="briefcase" size={22} color="white" />
    </View>
    {showNameTag && <Text style={styles.nameTag}>{marker.name}</Text>}
  </View>
);

// --- CLUSTER MARKER ---
const getClusterColor = (pointCount: number): string => {
  if (pointCount < 10) return '#51D5A4';
  if (pointCount < 25) return '#FFC300';
  return '#FF5733';
};

interface ClusterMarkerProps {
  pointCount: number;
  mainItem?: WorkerLocation | ProjectLocation | null;
}

const ClusterMarker: React.FC<ClusterMarkerProps> = ({ pointCount, mainItem }) => {
  if (mainItem) {
    return (
      <div style={{ cursor: 'pointer' }}>
        <View style={styles.overlapMarker}>
          {mainItem.type === 'worker' ? (
            <ModernWorkerMarker marker={mainItem as WorkerLocation} showNameTag={false} />
          ) : (
            <ModernProjectMarker marker={mainItem as ProjectLocation} showNameTag={false} />
          )}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pointCount}</Text>
          </View>
        </View>
      </div>
    );
  }

  const color = getClusterColor(pointCount);
  return (
    <div style={{ cursor: 'pointer' }}>
      <View style={[styles.markerBase, styles.clusterMarker, { backgroundColor: color }]}>
        <Text style={styles.clusterMarkerText}>{pointCount}</Text>
      </View>
    </div>
  );
};

// --- CUSTOM POPUPS ---
const CustomPopup = ({ popupInfo, map }: { popupInfo: ItemInCluster | null; map: maplibregl.Map | null }) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (popupInfo && popupInfo.location && map) {
      const point = map.project([popupInfo.location.longitude, popupInfo.location.latitude]);
      setPosition(point);
    } else {
      setPosition(null);
    }
  }, [popupInfo, map]);

  if (!popupInfo || !position) return null;

  const isWorker = popupInfo.type === 'worker';
  const popupWidth = 180; // same as minWidth in styles.popupContent
  const popupHeight = 60; // estimated popup height

  return (
    <View
      style={{
        ...styles.popupContainer,
        top: position.y - popupHeight,
        left: position.x - popupWidth / 2,
      }}
    >
      <View style={styles.popupContent}>
        {isWorker && (popupInfo as WorkerLocation).avatar && (
          <Image source={{ uri: (popupInfo as WorkerLocation).avatar }} style={[styles.popupAvatar] as ImageStyle} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.popupTitle}>{popupInfo.name}</Text>
          {isWorker && (popupInfo as WorkerLocation).lastSeen && (
            <Text style={styles.popupText}>
              Last seen: {moment((popupInfo as WorkerLocation).lastSeen).fromNow()}
            </Text>
          )}
          {!isWorker && <Text style={styles.popupText}>{(popupInfo as ProjectLocation)?.address || 'No address available'}</Text>}
        </View>
      </View>
    </View>
  );
};

const HoverPopup = ({ hoverInfo, map }: { hoverInfo: ItemInCluster | null; map: maplibregl.Map | null }) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (hoverInfo && hoverInfo.location && map) {
      const point = map.project([hoverInfo.location.longitude, hoverInfo.location.latitude]);
      const markerHeight = 42; // Based on markerBase style
      setPosition({ x: point.x, y: point.y - markerHeight / 2 }); // Position at the top edge of the marker
    } else {
      setPosition(null);
    }
  }, [hoverInfo, map]);

  if (!hoverInfo || !position) return null;

  const isWorker = hoverInfo.type === 'worker';
  const popupWidth = 180;
  const popupHeight = 60; // This is the estimated height of the popup content itself

  return (
    <View
      style={{
        ...styles.hoverPopupContainer,
        top: position.y - popupHeight - 10, // 10px padding from the marker
        left: position.x - popupWidth / 2,
      }}
    >
      <View style={styles.popupContent}>
        {isWorker && (hoverInfo as WorkerLocation).avatar && (
          <Image source={{ uri: (hoverInfo as WorkerLocation).avatar }} style={[styles.popupAvatar]} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.popupTitle}>{hoverInfo.name}</Text>
          {isWorker && (hoverInfo as WorkerLocation).lastSeen && (
            <Text style={styles.popupText}>
              Last seen: {moment((hoverInfo as WorkerLocation).lastSeen).fromNow()}
            </Text>
          )}
          {!isWorker && <Text style={styles.popupText}>{(hoverInfo as ProjectLocation).address || 'No address available'}</Text>}
        </View>
      </View>
    </View>
  );
};

// --- MAIN MAP VIEW ---
export const MapView: React.FC<MapViewProps> = ({
  selectedWorkers = [],
  selectedProjects = [],
  initialRegion,
  showNameTag = true,
}) => {
  const mapRef = useRef<any>(null);

  const [popupInfo, setPopupInfo] = useState<ItemInCluster | null>(null);
  const [hoverInfo, setHoverInfo] = useState<ItemInCluster | null>(null);
  const [viewState, setViewState] = useState({
    latitude: initialRegion?.latitude || 52.52,
    longitude: initialRegion?.longitude || 13.405,
    zoom: initialRegion?.zoom || 10,
  });
  const [bounds, setBounds] = useState<[number, number, number, number]>([-180, -90, 180, 90]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [spiderfiedMarkers, setSpiderfiedMarkers] = useState<any[]>([]);
  const [spiderfiedParentId, setSpiderfiedParentId] = useState<string | number | null>(null);

  const features = useMemo(() => [
    ...selectedWorkers.filter(w => w.location).map(w => ({
      type: 'Feature' as const,
      properties: { ...w, type: 'worker' as const, lastSeen: moment().subtract(Math.random() * 60, 'minutes').toISOString() },
      geometry: { type: 'Point' as const, coordinates: [w.location.longitude, w.location.latitude] },
    })),
    ...selectedProjects.filter(p => p.location).map(p => ({
      type: 'Feature' as const,
      properties: { ...p, type: 'project' as const },
      geometry: { type: 'Point' as const, coordinates: [p.location.longitude, p.location.latitude] },
    })),
  ], [selectedWorkers, selectedProjects]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    const allLocations = features.map(f => f.geometry.coordinates as [number, number]);
    if (features.length === 0) {
      if (initialRegion) {
        map.easeTo({ center: [initialRegion.longitude, initialRegion.latitude], zoom: initialRegion.zoom || 10, duration: 1000 });
      }
      return;
    };

    const boundsToFit = new LngLatBounds();
    allLocations.forEach(loc => boundsToFit.extend(loc));
    if(!boundsToFit.isEmpty()) {
      map.fitBounds(boundsToFit, { padding: 100, maxZoom: 15, duration: 1000 });
    }
  }, [features, isMapLoaded]); // Removed initialRegion dependency

  const supercluster = useMemo(() => {
    const sc = new Supercluster({ radius: 40, maxZoom: 16 });
    sc.load(features as Supercluster.PointFeature<ItemInCluster>[]);
    return sc;
  }, [features]);

  const clusters = useMemo(() => {
    if (!supercluster) return [];
    return supercluster.getClusters(bounds, Math.floor(viewState.zoom));
  }, [supercluster, bounds, viewState.zoom]); // Changed zoom to viewState.zoom

  const renderableItems = useMemo(() => {
    const items: any[] = [];
    const overlappingPoints: { [key: string]: any[] } = {};

    for (const item of clusters) {
      if (item.properties.cluster) {
        items.push({ ...item, id: `cluster-${item.id}` });
      } else {
        const lon = item.geometry.coordinates[0].toFixed(5);
        const lat = item.geometry.coordinates[1].toFixed(5);
        const coords = `${lon},${lat}`;
        if (!overlappingPoints[coords]) overlappingPoints[coords] = [];
        overlappingPoints[coords].push(item);
      }
    }

    for (const key in overlappingPoints) {
      const points = overlappingPoints[key];
      if (points.length > 1) {
        const projects = points.map(p => p.properties).filter(p => p.type === 'project');
        const workers = points.map(p => p.properties).filter(w => w.type === 'worker');
        projects.sort((a, b) => new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime());
        workers.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));

        items.push({
          id: `overlap-${key}`,
          isOverlap: true,
          properties: { point_count: points.length, mainItem: projects[0] || workers[0] },
          geometry: points[0].geometry,
          points,
        });
      } else {
        items.push({ ...points[0], id: `single-${points[0].properties.id}` });
      }
    }
    return items;
  }, [clusters]);

  const onMapLoad = useCallback((evt: maplibregl.MapLibreEvent) => {
    mapRef.current = evt.target;
    if (!mapRef.current) return;
    setIsMapLoaded(true);
  }, []);

  const generateCircleParams = (count: number, center: [number, number], radius: number) => {
    const angleStep = (Math.PI * 2) / count;
    return Array.from({ length: count }, (_, i) => {
      const angle = i * angleStep;
      return {
        x: center[0] + radius * Math.cos(angle),
        y: center[1] + radius * Math.sin(angle),
        angle,
      };
    });
  };

  const handleSingleMarkerClick = (item: any) => {
    const map = mapRef.current;
    if (!map) return;
    setSpiderfiedMarkers([]); // Ensure immediate clear
    setSpiderfiedParentId(null); // Ensure immediate clear
    setPopupInfo(null);
    setHoverInfo(null);
    setPopupInfo(item.properties as ItemInCluster);
  };

  const handleSpiderfy = (clusterOrOverlap: any) => {
    const map = mapRef.current;
    if (!map) return;
    clearAll();

    let leaves;
    let centerCoord;
    let parentId;

    if (clusterOrOverlap.isOverlap) {
      leaves = clusterOrOverlap.points;
      centerCoord = clusterOrOverlap.geometry.coordinates;
      parentId = clusterOrOverlap.id;
    } else { // It's a real Supercluster cluster
      leaves = supercluster.getLeaves(clusterOrOverlap.properties.cluster_id, Infinity);
      centerCoord = clusterOrOverlap.geometry.coordinates;
      parentId = clusterOrOverlap.id;
    }

    const spiderfyRadius = 50;
    const pixelCenter = map.project(centerCoord);
    const spiderfyPoints = generateCircleParams(leaves.length, [pixelCenter.x, pixelCenter.y], spiderfyRadius);

    const newSpiderfiedMarkers = leaves.map((leaf: any, index: any) => {
      const spiderfyPixel = spiderfyPoints[index];
      const spiderfyLatLng = map.unproject([spiderfyPixel.x, spiderfyPixel.y]);
      return {
        ...leaf,
        id: `spider-${leaf.properties.type}-${leaf.properties.id}`,
        properties: {
          ...leaf.properties,
          location: {
            latitude: spiderfyLatLng.lat,
            longitude: spiderfyLatLng.lng,
          },
        }
      };
    });
    setSpiderfiedMarkers(newSpiderfiedMarkers);
    setSpiderfiedParentId(parentId);
  };

  const clearAll = () => {
    setSpiderfiedMarkers([]);
    setSpiderfiedParentId(null);
    setPopupInfo(null);
    setHoverInfo(null);
  };

  return (
    <View style={styles.mapContainer}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => {
          setViewState(evt.viewState);
          if (mapRef.current) {
            const map = mapRef.current;
            const newBounds = map.getBounds();
            setBounds([newBounds.getWest(), newBounds.getSouth(), newBounds.getEast(), newBounds.getNorth()]);
          }
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={TILE_PROVIDER_STYLE as any}
        attributionControl={false}
        onLoad={onMapLoad}
        onClick={clearAll}
        onMoveEnd={() => { // Changed from onMove to onMoveEnd to avoid too many re-renders
          if (popupInfo) setPopupInfo(null);
          if (hoverInfo) setHoverInfo(null);
          if (spiderfiedMarkers.length > 0) clearAll();
        }}
      >
        {renderableItems
          .filter(item => item.id !== spiderfiedParentId)
          .map(item => {
            const isCluster = !!item.properties.cluster;
            const isOverlap = !!item.isOverlap;

            if (isCluster) {
              const pointCount = item.properties.point_count;
              const leaves = supercluster.getLeaves(item.properties.cluster_id, Infinity);
              const projects = leaves.map(l => l.properties).filter(p => p.type === 'project');
              const workers = leaves.map(l => l.properties).filter(w => w.type === 'worker');
              projects.sort((a, b) => new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime());
              workers.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
              const mainItem = projects[0] || workers[0];

              return (
                <MapLibreMarker key={item.id} latitude={item.geometry.coordinates[1]} longitude={item.geometry.coordinates[0]}>
                  <div
                    onClick={e => {
                      e.stopPropagation();
                      handleSpiderfy(item);
                    }}
                    onMouseEnter={() => {
                      if (!popupInfo && mainItem) setHoverInfo(mainItem as ItemInCluster);
                    }}
                    onMouseLeave={() => setHoverInfo(null)}
                  >
                    <ClusterMarker pointCount={pointCount} mainItem={mainItem as WorkerLocation | ProjectLocation} />
                  </div>
                </MapLibreMarker>
              );
            } else if (isOverlap) {
              return (
                <MapLibreMarker key={item.id} latitude={item.geometry.coordinates[1]} longitude={item.geometry.coordinates[0]}>
                  <div
                    onClick={e => {
                      e.stopPropagation();
                      handleSpiderfy(item);
                    }}
                    onMouseEnter={() => {
                      if (!popupInfo && item.properties.mainItem) setHoverInfo(item.properties.mainItem as ItemInCluster);
                    }}
                    onMouseLeave={() => setHoverInfo(null)}
                  >
                    <ClusterMarker pointCount={item.properties.point_count} mainItem={item.properties.mainItem as WorkerLocation | ProjectLocation} />
                  </div>
                </MapLibreMarker>
              );
            } else {
              return (
                <MapLibreMarker key={item.id} latitude={item.geometry.coordinates[1]} longitude={item.geometry.coordinates[0]}>
                  <div
                    onClick={e => {
                      e.stopPropagation();
                      handleSingleMarkerClick(item);
                    }}
                    onMouseEnter={() => {
                      if (!popupInfo) setHoverInfo(item.properties as ItemInCluster);
                    }}
                    onMouseLeave={() => setHoverInfo(null)}
                  >
                    {item.properties.type === 'worker' ? (
                      <ModernWorkerMarker marker={item.properties as WorkerLocation} showNameTag={showNameTag} />
                    ) : (
                      <ModernProjectMarker marker={item.properties as ProjectLocation} showNameTag={showNameTag} />
                    )}
                  </div>
                </MapLibreMarker>
              );
            }
          })}

        {spiderfiedMarkers.map(marker => (
          <MapLibreMarker key={marker.id} latitude={marker.properties.location.latitude} longitude={marker.properties.location.longitude} style={{ zIndex: 100 }}>
            <div
              onClick={e => {
                e.stopPropagation();
                handleSingleMarkerClick(marker);
              }}
              onMouseEnter={() => {
                if (!popupInfo) setHoverInfo(marker.properties as ItemInCluster);
              }}
              onMouseLeave={() => setHoverInfo(null)}
            >
              {marker.properties.type === 'worker' ? (
                <ModernWorkerMarker marker={marker.properties as WorkerLocation} showNameTag={showNameTag} />
              ) : (
                <ModernProjectMarker marker={marker.properties as ProjectLocation} showNameTag={showNameTag} />
              )}
            </div>
          </MapLibreMarker>
        ))}

        <CustomPopup popupInfo={popupInfo} map={mapRef.current} />
        <HoverPopup hoverInfo={hoverInfo} map={mapRef.current} />

        <NavigationControl />
        {spiderfiedMarkers.length > 0 && (
          <View style={styles.clearSpiderfyButtonContainer}>
            <Button
              title="Merge Markers"
              onPress={clearAll}
              type="secondary"
              style={styles.clearSpiderfyButton}
              textStyle={styles.clearSpiderfyButtonText}
            />
          </View>
        )}
      </Map>
    </View>
  );
};

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

  markerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },

  markerBase: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },

  workerMarker: {
    backgroundColor: theme.colors.primary,
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },

  nameTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginTop: 4,
    fontSize: 11,
    fontWeight: '500',
    color: '#333',
  },

  overlapMarker: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  clusterMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },

  clusterMarkerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },

  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.danger,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },

  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },

  popupContainer: {
    position: 'absolute',
    zIndex: 200,
    pointerEvents: 'none',
  },

  hoverPopupContainer: {
    position: 'absolute',
    zIndex: 300,
    pointerEvents: 'none',
  },

  popupContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(1.5),
    backgroundColor: 'white',
    borderRadius: theme.radius.lg,
    minWidth: 180,
  },

  popupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: theme.spacing(1.5),
  },

  popupTitle: {
    fontWeight: '600',
    fontSize: 15,
    color: theme.colors.headingText,
  },

  popupText: {
    fontSize: 12,
    color: theme.colors.bodyText,
    marginTop: 2,
  },

  clearSpiderfyButtonContainer: {
    position: 'absolute',
    bottom: theme.spacing(3),
    left: '50%',
    transform: [{ translateX: -50 }] as any,
    zIndex: 150,
  },

  clearSpiderfyButton: {
    paddingVertical: theme.spacing(1),
    paddingHorizontal: theme.spacing(2),
    minHeight: 'auto',
  },

  clearSpiderfyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
