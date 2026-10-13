import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface EmbedMapViewProps {
  latitude: number;
  longitude: number;
  name: string;
  /** Optional radius in meters — renders a visual circle overlay */
  radius?: number;
}

export const EmbedMapView: React.FC<EmbedMapViewProps> = ({ latitude, longitude, name, radius }) => {
  // Zoom level that makes the radius circle fill roughly 60% of the view
  const zoom = radius
    ? Math.max(10, Math.min(17, Math.round(14 - Math.log2(radius / 150))))
    : 14;
  const embedUrl = `https://www.google.com/maps?q=${latitude},${longitude}&z=${zoom}&output=embed`;
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  return (
    <View style={webStyles.container}>
      <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" style={webStyles.link}>
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          style={webStyles.iframe as any}
          loading="lazy"
          title={`Map of ${name}`}
        />
      </a>
      {/* Radius circle overlay — purely visual, CSS-based */}
      {radius != null && (
        <div style={webStyles.circleOverlay as any} aria-hidden="true">
          <div style={webStyles.circleRing as any} />
        </div>
      )}
    </View>
  );
};

// Use StyleSheet.create for React Native View styles
const styles = StyleSheet.create({
  container: {
    height: '100%', // This will be controlled by the parent mapWrapper
    width: '100%',
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
});

// Use a plain JavaScript object for web styles
const webStyles = {
  container: styles.container,
  link: {
    display: 'block',
    width: '100%',
    height: '100%',
    textDecorationLine: 'none',
  },
  iframe: {
    border: 0,
    borderRadius: theme.radius.md,
    pointerEvents: 'none',
    maxWidth: '100%',
    height: '100%',
  },
  // Centred circle overlay — pointer-events none so the iframe link still works
  circleOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  circleRing: {
    width: '60%',
    paddingBottom: '60%', // square → circle via border-radius
    borderRadius: '50%',
    backgroundColor: `${theme.colors.primary}18`,
    border: `2px solid ${theme.colors.primary}60`,
    pointerEvents: 'none',
  },
};

export const Marker = () => null;
export const Callout = () => null;
