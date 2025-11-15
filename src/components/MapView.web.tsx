import React, { useRef, useEffect, useState } from 'react';
import Map, { Marker as MapLibreMarker, NavigationControl, Popup } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { View, Image, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';
import { LngLatBounds } from 'maplibre-gl';
import { Ionicons } from '@expo/vector-icons';

const TILE_PROVIDER_STYLE = "https://tiles.stadiamaps.com/styles/osm_bright.json";

interface WorkerLocation {
  id: string;
  name: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  avatar?: string;
  lastSeen?: string;
}

interface ProjectLocation {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface MapViewProps {
  selectedWorkers?: WorkerLocation[];
  selectedProjects?: ProjectLocation[];
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

export const MapView: React.FC<MapViewProps> = ({ selectedWorkers = [], selectedProjects = [], initialRegion }) => {
  const mapRef = useRef<any>(null);
  const [workerPopupInfo, setWorkerPopupInfo] = useState<WorkerLocation | null>(null);
  const [projectPopupInfo, setProjectPopupInfo] = useState<ProjectLocation | null>(null);

  const initialViewState = initialRegion
    ? {
        latitude: initialRegion.latitude,
        longitude: initialRegion.longitude,
        zoom: 10,
      }
    : {
        latitude: 52.52,
        longitude: 13.405,
        zoom: 10,
      };

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current.getMap();
    const workerLocations = selectedWorkers.map(w => w.location).filter(l => l) as { latitude: number; longitude: number }[];
    const projectLocations = selectedProjects.map(p => p.location).filter(l => l) as { latitude: number; longitude: number }[];
    const allLocations = [...workerLocations, ...projectLocations];

    if (allLocations.length === 0) {
      setWorkerPopupInfo(null);
      setProjectPopupInfo(null);
      return;
    }

    if (allLocations.length === 1) {
      map.flyTo({
        center: [allLocations[0].longitude, allLocations[0].latitude],
        zoom: 14,
      });
    } else {
      const bounds = new LngLatBounds();
      allLocations.forEach(loc => {
        bounds.extend([loc.longitude, loc.latitude]);
      });
      map.fitBounds(bounds, { padding: 100 });
    }
  }, [selectedWorkers, selectedProjects]);

  return (
    <View style={styles.mapContainer}>
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={TILE_PROVIDER_STYLE as any}
        attributionControl={false}
        onClick={() => {
          setWorkerPopupInfo(null);
          setProjectPopupInfo(null);
        }}
      >
        {selectedWorkers.map(worker =>
          worker.location ? (
            <MapLibreMarker
              key={`worker-${worker.id}`}
              latitude={worker.location.latitude}
              longitude={worker.location.longitude}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setWorkerPopupInfo(worker);
                setProjectPopupInfo(null);
              }}
            >
              <View style={styles.markerContainer}>
                <Image source={{ uri: worker.avatar }} style={styles.avatar} />
              </View>
            </MapLibreMarker>
          ) : null
        )}

        {selectedProjects.map(project =>
          project.location ? (
            <MapLibreMarker
              key={`project-${project.id}`}
              latitude={project.location.latitude}
              longitude={project.location.longitude}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setProjectPopupInfo(project);
                setWorkerPopupInfo(null);
              }}
            >
              <View style={styles.projectMarker}>
                <Ionicons name="briefcase" size={24} color="white" />
              </View>
            </MapLibreMarker>
          ) : null
        )}

        {workerPopupInfo && workerPopupInfo.location && (
          <Popup
            latitude={workerPopupInfo.location.latitude}
            longitude={workerPopupInfo.location.longitude}
            onClose={() => setWorkerPopupInfo(null)}
            closeOnClick={false}
            anchor="bottom"
          >
            <View style={styles.popupContent}>
              <Text style={styles.popupText}>Last seen: {workerPopupInfo.lastSeen}</Text>
            </View>
          </Popup>
        )}

        {projectPopupInfo && projectPopupInfo.location && (
          <Popup
            latitude={projectPopupInfo.location.latitude}
            longitude={projectPopupInfo.location.longitude}
            onClose={() => setProjectPopupInfo(null)}
            closeOnClick={false}
            anchor="bottom"
          >
            <View style={styles.popupContent}>
              <Text style={styles.popupText}>{projectPopupInfo.name}</Text>
            </View>
          </Popup>
        )}

        <NavigationControl />
      </Map>
    </View>
  );
};

export const Marker = () => null;
export const Callout = () => null;

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.lightBorder,
    margin: theme.spacing(2),
  },
  markerContainer: {
    padding: 5,
    borderRadius: 50,
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  projectMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    cursor: 'pointer',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  popupContent: {
    padding: 10,
  },
  popupText: {
    fontSize: 14,
  },
});
