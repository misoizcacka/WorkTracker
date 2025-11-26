import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import Map, { Marker as MapLibreMarker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { View, Image, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';
import maplibregl, { LngLatBounds } from 'maplibre-gl';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
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
  showNameTag?: boolean; // Prop for name tag visibility
}

// --- NEW MODERN MARKER COMPONENTS ---

const ModernWorkerMarker = ({ marker, showNameTag = true }: { marker: WorkerLocation; showNameTag?: boolean }) => (
  <div style={styles.markerContainer}>
    <View style={[styles.markerBase, styles.workerMarker]}>
      {marker.avatar ? (
        <Image source={{ uri: marker.avatar }} style={styles.avatar} />
      ) : (
        <FontAwesome5 name="hard-hat" size={20} color="white" />
      )}
    </View>
    {showNameTag && <div style={styles.nameTag}>{marker.name}</div>}
  </div>
);

const ModernProjectMarker = ({ marker, showNameTag = true }: { marker: ProjectLocation; showNameTag?: boolean }) => (
  <div style={styles.markerContainer}>
    <View style={[styles.markerBase, { backgroundColor: marker.color || theme.colors.secondary }]}>
      <Ionicons name="briefcase" size={22} color="white" />
    </View>
    {showNameTag && <div style={styles.nameTag}>{marker.name}</div>}
  </div>
);


const getClusterColor = (pointCount: number): string => {
  if (pointCount < 10) return '#51D5A4'; // Green for small clusters
  if (pointCount < 25) return '#FFC300'; // Yellow for medium clusters
  return '#FF5733'; // Red for large clusters
};

const ClusterMarker = ({ pointCount, mainItem }) => {
  // If it's an overlap pseudo-cluster or a real cluster, show the main item.
  if (mainItem) {
    return (
      <div style={{ cursor: 'pointer' }}>
        <View style={styles.overlapMarker}>
          {mainItem.type === 'worker' ? <ModernWorkerMarker marker={mainItem} showNameTag={false} /> : <ModernProjectMarker marker={mainItem} showNameTag={false} />}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pointCount}</Text>
          </View>
        </View>
      </div>
    );
  }
  
  // Fallback for clusters without a main item
  const color = getClusterColor(pointCount);
  return (
    <div style={{ cursor: 'pointer' }}>
      <View style={[styles.markerBase, styles.clusterMarker, { backgroundColor: color }]}>
        <Text style={styles.clusterMarkerText}>{pointCount}</Text>
      </View>
    </div>
  );
};


// --- NEW CUSTOM POPUP ---
const CustomPopup = ({ popupInfo, map }: { popupInfo: ItemInCluster | null, map: maplibregl.Map | null }) => {
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

  return (
    <div style={{ ...styles.popupContainer, top: position.y, left: position.x }}>
      <div style={styles.popupContent}>
        {isWorker && (popupInfo as WorkerLocation).avatar && (
          <Image source={{ uri: (popupInfo as WorkerLocation).avatar }} style={styles.popupAvatar} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.popupTitle}>{popupInfo.name}</Text>
          {isWorker && (popupInfo as WorkerLocation).lastSeen && (
            <Text style={styles.popupText}>
              Last seen: {moment((popupInfo as WorkerLocation).lastSeen).fromNow()}
            </Text>
          )}
           {!isWorker && (
            <Text style={styles.popupText}>
              {(popupInfo as ProjectLocation).address}
            </Text>
          )}
        </View>
      </div>
    </div>
  );
};

const HoverPopup = ({ hoverInfo }: { hoverInfo: ItemInCluster | null }) => {
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    if (hoverInfo) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      setMousePosition(null);
    };
  }, [hoverInfo]);

  if (!hoverInfo || !mousePosition) return null;

  const isWorker = hoverInfo.type === 'worker';

  return (
    <div style={{ ...styles.hoverPopupContainer, top: mousePosition.y, left: mousePosition.x }}>
      <div style={styles.popupContent}>
        <View style={{ flex: 1 }}>
          <Text style={styles.popupTitle}>{hoverInfo.name}</Text>
          {isWorker && (hoverInfo as WorkerLocation).lastSeen && (
            <Text style={styles.popupText}>
              Last seen: {moment((hoverInfo as WorkerLocation).lastSeen).fromNow()}
            </Text>
          )}
          {!isWorker && (
            <Text style={styles.popupText}>
              {(hoverInfo as ProjectLocation).address}
            </Text>
          )}
        </View>
      </div>
    </div>
  );
};


export const MapView: React.FC<MapViewProps> = ({ selectedWorkers = [], selectedProjects = [], initialRegion, showNameTag = true }) => {
  const mapRef = useRef<any>(null);

  const [popupInfo, setPopupInfo] = useState<ItemInCluster | null>(null);
  const [hoverInfo, setHoverInfo] = useState<ItemInCluster | null>(null);
  const [zoom, setZoom] = useState(initialRegion?.zoom || 10);
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

  const supercluster = useMemo(() => {
    const sc = new Supercluster({ radius: 40, maxZoom: 16 });
    sc.load(features as Supercluster.PointFeature<ItemInCluster>[]);
    return sc;
  }, [features]);

  const clusters = useMemo(() => {
    if (!supercluster) return [];
    return supercluster.getClusters(bounds, Math.floor(zoom));
  }, [supercluster, bounds, zoom]);

  const renderableItems = useMemo(() => {
    const items = [];
    const overlappingPoints: { [key: string]: any[] } = {};

    for (const item of clusters) {
      if (item.properties.cluster) {
        items.push({ ...item, id: `cluster-${item.id}` });
      } else {
        const lon = item.geometry.coordinates[0].toFixed(5);
        const lat = item.geometry.coordinates[1].toFixed(5);
        const coords = `${lon},${lat}`;
        if (!overlappingPoints[coords]) {
          overlappingPoints[coords] = [];
        }
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
    const map = mapRef.current;
    if (!map) return;
    setIsMapLoaded(true);

    const onMoveEnd = () => {
      if (!mapRef.current) return;
      const map = mapRef.current;
      setZoom(map.getZoom());
      const newBounds = map.getBounds();
      setBounds([newBounds.getWest(), newBounds.getSouth(), newBounds.getEast(), newBounds.getNorth()]);
    };
    map.on('moveend', onMoveEnd);
    return () => {
      map.off('moveend', onMoveEnd);
    }
  }, []);

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
  }, [features, isMapLoaded, initialRegion]);

  const generateCircleParams = (count: number, center: [number, number], radius: number): { x: number; y: number; angle: number; }[] => {
    const angleStep = (Math.PI * 2) / count;
    const points = [];
    for (let i = 0; i < count; i++) {
        const angle = i * angleStep;
        points.push({
            x: center[0] + radius * Math.cos(angle),
            y: center[1] + radius * Math.sin(angle),
            angle: angle,
        });
    }
    return points;
  };

  const handleSingleMarkerClick = (item: any) => {
    const map = mapRef.current;
    if (!map) return;
    clearAll();
    map.easeTo({
      center: item.geometry.coordinates,
      offset: [0, -100],
      duration: 500,
    });
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

    const newSpiderfiedMarkers = leaves.map((leaf, index) => {
      const spiderfyPixel = spiderfyPoints[index];
      const spiderfyLatLng = map.unproject([spiderfyPixel.x, spiderfyPixel.y]);
      return {
        ...leaf,
        id: `spider-${leaf.properties.id}`,
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
  }

  return (
    <View style={styles.mapContainer}>
      <Map
        ref={mapRef}
        initialViewState={{ latitude: initialRegion?.latitude || 52.52, longitude: initialRegion?.longitude || 13.405, zoom: initialRegion?.zoom || 10 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={TILE_PROVIDER_STYLE as any}
        attributionControl={false}
        onLoad={onMapLoad}
        onClick={clearAll}
        onMove={() => { 
          if (popupInfo) setPopupInfo(null);
          if (hoverInfo) setHoverInfo(null);
          if (spiderfiedMarkers.length > 0) clearAll();
        }}
      >
        {renderableItems.filter(item => item.id !== spiderfiedParentId).map(item => {
          if (item.properties.cluster) { // Real Supercluster cluster
            const pointCount = item.properties.point_count;
            const leaves = supercluster.getLeaves(item.properties.cluster_id, Infinity);
            const projects = leaves.map(l => l.properties).filter(p => p.type === 'project');
            const workers = leaves.map(l => l.properties).filter(w => w.type === 'worker');
            projects.sort((a, b) => new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime());
            workers.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
            const mainItem = projects[0] || workers[0];
            
            return (
              <MapLibreMarker
                key={item.id}
                latitude={item.geometry.coordinates[1]}
                longitude={item.geometry.coordinates[0]}
              >
                <div 
                  onClick={(e) => { e.stopPropagation(); handleSpiderfy(item); }}
                  onMouseEnter={() => { if (!popupInfo) setHoverInfo(mainItem); }}
                  onMouseLeave={() => setHoverInfo(null)}
                >
                  <ClusterMarker pointCount={pointCount} mainItem={mainItem} />
                </div>
              </MapLibreMarker>
            );
          } else if (item.isOverlap) { // Overlapping points
            return (
              <MapLibreMarker
                key={item.id}
                latitude={item.geometry.coordinates[1]}
                longitude={item.geometry.coordinates[0]}
              >
                <div 
                  onClick={(e) => { e.stopPropagation(); handleSpiderfy(item); }}
                  onMouseEnter={() => { if (!popupInfo) setHoverInfo(item.properties.mainItem); }}
                  onMouseLeave={() => setHoverInfo(null)}
                >
                  <ClusterMarker pointCount={item.properties.point_count} mainItem={item.properties.mainItem} />
                </div>
              </MapLibreMarker>
            );
          } else { // Single marker
            return (
              <MapLibreMarker
                key={item.id}
                latitude={item.geometry.coordinates[1]}
                longitude={item.geometry.coordinates[0]}
              >
                <div 
                  onClick={e => { e.stopPropagation(); handleSingleMarkerClick(item); }}
                  onMouseEnter={() => { if (!popupInfo) setHoverInfo(item.properties); }}
                  onMouseLeave={() => setHoverInfo(null)}
                >
                  {item.properties.type === 'worker' ? 
                    <ModernWorkerMarker marker={item.properties as WorkerLocation} showNameTag={showNameTag} /> : 
                    <ModernProjectMarker marker={item.properties as ProjectLocation} showNameTag={showNameTag} />}
                </div>
              </MapLibreMarker>
            );
          }
        })}

        {spiderfiedMarkers.map((marker) => (
          <MapLibreMarker
            key={marker.id}
            latitude={marker.properties.location.latitude}
            longitude={marker.properties.location.longitude}
            style={{ zIndex: 100 }}
          >
            <div 
              onClick={e => { e.stopPropagation(); handleSingleMarkerClick(marker)}}
              onMouseEnter={() => { if (!popupInfo) setHoverInfo(marker.properties); }}
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
        <HoverPopup hoverInfo={hoverInfo} />

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

const styles = StyleSheet.create({
  mapContainer: { flex: 1, borderRadius: theme.radius.md, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.borderColor, margin: theme.spacing(2) },
  // --- New Marker Styles ---
  markerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    animation: 'fadeIn 0.3s ease-in-out',
  },
  markerBase: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    cursor: 'pointer',
  },
  workerMarker: { 
    backgroundColor: theme.colors.primary, 
  },
  projectMarker: {
    // Color is set inline
  },
  avatar: { 
    width: 38, 
    height: 38, 
    borderRadius: 19 
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
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    whiteSpace: 'nowrap',
  },
  overlapMarker: { 
    position: 'relative', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  // --- Cluster & Badge ---
  clusterMarker: {
     // inherits from markerBase
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
    borderColor: 'white' 
  },
  badgeText: { 
    color: 'white', 
    fontSize: 10, 
    fontWeight: 'bold' 
  },
  // --- New Popup Styles ---
  popupContainer: {
    position: 'absolute',
    transform: 'translate(-50%, -100%)', // Center above the point, then move up
    zIndex: 200,
    animation: 'fadeScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    marginTop: -25, // Negative margin to create space between marker and popup
    pointerEvents: 'none', 
  },
  hoverPopupContainer: {
    position: 'fixed',
    transform: 'translate(15px, 15px)', // Offset from cursor
    zIndex: 300,
    pointerEvents: 'none',
    animation: 'fadeScaleIn 0.2s ease-out',
  },
  popupContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(1.5),
    backgroundColor: 'white',
    borderRadius: theme.radius.lg,
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
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

  // --- Controls ---
  clearSpiderfyButtonContainer: {
    position: 'absolute',
    bottom: theme.spacing(3),
    left: '50%',
    transform: 'translateX(-50%)',
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

  // --- Keyframe Animations ---
  '@keyframes fadeIn': {
    '0%': { opacity: 0 },
    '100%': { opacity: 1 },
  },
  '@keyframes fadeScaleIn': {
    '0%': { opacity: 0, transform: 'translateY(5px) scale(0.95)' },
    '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
  },
});
