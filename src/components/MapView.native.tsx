import React, { useMemo, useState, useRef, useEffect } from 'react';
import RNMapView, { Marker, Callout, MapViewProps as RNMapViewProps } from 'react-native-maps';
import { View, Image, Text, StyleSheet, Dimensions } from 'react-native';
import { theme } from '../theme';
import Supercluster from 'supercluster';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';

// Import types from the original map-types file
import {
  WorkerLocation,
  ProjectLocation,
  RenderableMarkerInfo,
  ItemInCluster,
  ClusterRenderableMarker,
} from './map-types';

interface NativeMapViewProps extends RNMapViewProps {
  selectedWorkers?: WorkerLocation[];
  selectedProjects?: ProjectLocation[];
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
    zoom?: number;
  };
}

export const MapView: React.FC<NativeMapViewProps> = ({ selectedWorkers = [], selectedProjects = [], initialRegion, children, ...props }) => {
  const mapViewRef = useRef<RNMapView>(null);
  const [zoom, setZoom] = useState(initialRegion?.zoom || 10);
  const [bounds, setBounds] = useState<[number, number, number, number]>([-180, -90, 180, 90]);

  // Memoize features
  const features = useMemo(() => [
    ...selectedWorkers.filter(w => w.location).map(w => ({
      type: 'Feature' as const,
      properties: { ...w, type: 'worker' as const },
      geometry: { type: 'Point' as const, coordinates: [w.location.longitude, w.location.latitude] },
    })),
    ...selectedProjects.filter(p => p.location).map(p => ({
      type: 'Feature' as const,
      properties: { ...p, type: 'project' as const },
      geometry: { type: 'Point' as const, coordinates: [p.location.longitude, p.location.latitude] },
    })),
  ], [selectedWorkers, selectedProjects]);

  const supercluster = useMemo(() => {
    const sc = new Supercluster({
        radius: 60,
        maxZoom: 16,
    });
    sc.load(features as Supercluster.PointFeature<ItemInCluster>[]);
    return sc;
  }, [features]);

  // Get clustered markers
  const clusteredMarkers = useMemo(() => {
    if (!supercluster) return [];

    const clusters = supercluster.getClusters(bounds, Math.floor(zoom));
    const renderableMarkers: RenderableMarkerInfo[] = [];

    clusters.forEach(cluster => {
      if (cluster.properties && cluster.properties.cluster) {
        renderableMarkers.push({
          id: `cluster-${cluster.properties.cluster_id}`,
          clusterId: cluster.properties.cluster_id,
          isCluster: true,
          location: { latitude: cluster.geometry.coordinates[1], longitude: cluster.geometry.coordinates[0] },
          count: cluster.properties.point_count,
          items: supercluster.getLeaves(cluster.properties.cluster_id, Infinity).map(leaf => leaf.properties as ItemInCluster),
        });
      } else {
        renderableMarkers.push({ ...(cluster.properties as ItemInCluster), isCluster: false });
      }
    });
    return renderableMarkers;
  }, [supercluster, zoom, bounds]);

  useEffect(() => {
    if (!mapViewRef.current) return;

    const allMarkerLocations = features.map(f => ({
      longitude: f.geometry.coordinates[0],
      latitude: f.geometry.coordinates[1],
    }));

    if (allMarkerLocations.length === 0) {
      return;
    }

    if (allMarkerLocations.length === 1) {
        mapViewRef.current.animateToRegion({
            ...allMarkerLocations[0],
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
        });
    } else {
        mapViewRef.current.fitToCoordinates(allMarkerLocations, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
        });
    }
  }, [features]);

  return (
    <RNMapView
      {...props}
      ref={mapViewRef}
      initialRegion={initialRegion}
      onRegionChangeComplete={(region) => {
        const newZoom = Math.log2(360 * ((Dimensions.get('window').width / 256) / region.longitudeDelta));
        setZoom(Math.floor(newZoom));
        setBounds([
          region.longitude - region.longitudeDelta / 2,
          region.latitude - region.latitudeDelta / 2,
          region.longitude + region.longitudeDelta / 2,
          region.latitude + region.latitudeDelta / 2,
        ]);
        if (props.onRegionChangeComplete) {
            props.onRegionChangeComplete(region, { isGesture: false });
        }
      }}
    >
      {clusteredMarkers.map(marker => (
        marker.location ? (
          <Marker
            key={marker.id}
            coordinate={marker.location}
            onPress={() => {
              if (marker.isCluster) {
                const expansionZoom = supercluster.getClusterExpansionZoom((marker as ClusterRenderableMarker).clusterId);
                const { width, height } = Dimensions.get('window');
                const latitudeDelta = 360 / Math.pow(2, expansionZoom);
                const longitudeDelta = latitudeDelta * (width / height);

                mapViewRef.current?.animateToRegion({
                  latitude: marker.location.latitude,
                  longitude: marker.location.longitude,
                  latitudeDelta,
                  longitudeDelta,
                });
              }
            }}
          >
            {marker.isCluster ? (
              <View style={styles.clusterMarker}>
                <Text style={styles.clusterMarkerText}>{marker.count}</Text>
              </View>
            ) : marker.type === 'worker' ? (
                (marker as WorkerLocation).avatar ? (
                    <View style={styles.markerContainer}>
                        <Image source={{ uri: (marker as WorkerLocation).avatar! }} style={styles.avatar} />
                    </View>
                ) : (
                    <View style={styles.workerMarker}>
                        <FontAwesome5 name="hard-hat" size={22} color="white" />
                    </View>
                )
            ) : (
              <View style={[styles.projectMarker, { backgroundColor: (marker as ProjectLocation).color || theme.colors.secondary }]}>
                <Ionicons name="briefcase" size={24} color="white" />
              </View>
            )}
            {!marker.isCluster && (
              <Callout>
                <View style={styles.calloutContainer}>
                  {marker.type === 'worker' ? (
                    <>
                      <Text style={styles.calloutTitle}>Worker: {marker.name}</Text>
                      <Text style={styles.calloutText}>Last seen: {(marker as WorkerLocation).lastSeen}</Text>
                      <Text style={styles.calloutText}>{(marker as WorkerLocation).address}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.calloutTitle}>Project: {marker.name}</Text>
                    </>
                  )}
                </View>
              </Callout>
            )}
          </Marker>
        ) : null
      ))}
      {children}
    </RNMapView>
  );
};

export { Marker, Callout };

const styles = StyleSheet.create({
    markerContainer: {
      padding: 0,
      borderRadius: 50,
      backgroundColor: 'transparent',
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    workerMarker: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.cardBackground,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    calloutContainer: {
      padding: 10,
      width: 200,
    },
    calloutTitle: {
      fontWeight: 'bold',
      fontSize: 16,
      marginBottom: theme.spacing(0.5),
    },
    calloutText: {
      fontSize: 14,
    },
    projectMarker: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.cardBackground,
    },
    projectMarkerText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 18,
    },
    clusterMarker: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
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
});