import React from 'react';
import RNMapView, { Marker, Callout, MapViewProps as RNMapViewProps } from 'react-native-maps';
import { View, Image, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface WorkerLocation {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  avatar?: string;
  lastSeen?: string;
  address?: string;
}

interface NativeMapViewProps extends RNMapViewProps {
  workers?: WorkerLocation[];
}

export const MapView: React.FC<NativeMapViewProps> = ({ workers = [], children, ...props }) => {
  return (
    <RNMapView {...props}>
      {workers.map(worker => (
        <Marker
          key={worker.id}
          coordinate={worker.location}
        >
          <View style={styles.markerContainer}>
            <Image source={{ uri: worker.avatar }} style={styles.avatar} />
          </View>
          <Callout>
            <View style={styles.calloutContainer}>
              <Text style={styles.calloutTitle}>{worker.name}</Text>
              <Text style={styles.calloutText}>Last seen: {worker.lastSeen}</Text>
              <Text style={styles.calloutText}>{worker.address}</Text>
            </View>
          </Callout>
        </Marker>
      ))}
      {children}
    </RNMapView>
  );
};

export { Marker, Callout };

const styles = StyleSheet.create({
  markerContainer: {
    padding: 5,
    borderRadius: 50,
    backgroundColor: 'white',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  calloutContainer: {
    padding: 10,
    width: 200,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  calloutText: {
    fontSize: 14,
  },
});
