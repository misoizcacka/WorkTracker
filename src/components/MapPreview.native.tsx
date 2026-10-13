/**
 * MapPreview.native.tsx
 * Uses react-native-maps with a Circle overlay for native platforms.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { MapView, Marker, Circle } from './MapView';

interface MapPreviewProps {
  latitude: number;
  longitude: number;
  radius?: number;
  height?: number;
}

export const MapPreview: React.FC<MapPreviewProps> = ({
  latitude,
  longitude,
  radius = 150,
  height = 150,
}) => {
  // Show ~3x the radius on each side
  const delta = (radius / 111320) * 6;

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={{ width: '100%', height }}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: delta,
          longitudeDelta: delta,
        }}
        scrollEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        zoomEnabled={false}
      >
        <Marker coordinate={{ latitude, longitude }} />
        <Circle
          center={{ latitude, longitude }}
          radius={radius}
          strokeWidth={2}
          strokeColor={theme.colors.primary}
          fillColor={theme.colors.primary + '20'}
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
});
