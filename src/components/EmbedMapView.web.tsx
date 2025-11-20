import React from 'react';
import { View, StyleSheet } from 'react-native'; // Import StyleSheet
import { theme } from '../theme';

interface EmbedMapViewProps {
  latitude: number;
  longitude: number;
  name: string;
}

export const EmbedMapView: React.FC<EmbedMapViewProps> = ({ latitude, longitude, name }) => {
  const embedUrl = `https://www.google.com/maps?q=${latitude},${longitude}&z=14&output=embed`;
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
  container: styles.container, // Reuse the React Native style for the container View
  link: {
    display: 'block', // Make the anchor tag take up the full space
    width: '100%',
    height: '100%',
    textDecorationLine: 'none', // Remove underline
  },
  iframe: {
    border: 0, // Converted from borderWidth: 0
    borderRadius: theme.radius.md,
    pointerEvents: 'none', // Disable interaction with the iframe directly
    maxWidth: '100%', // Ensure iframe doesn't exceed its container width
    height: '100%', // Ensure iframe takes full height of its container
  },
};

export const Marker = () => null;
export const Callout = () => null;
