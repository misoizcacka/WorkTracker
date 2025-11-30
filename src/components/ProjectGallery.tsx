import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface ProjectGalleryProps {
  images: string[];
  onImagePress?: (images: string[], index: number) => void;
}

const { width: windowWidth } = Dimensions.get('window');

const ProjectGallery: React.FC<ProjectGalleryProps> = ({ images, onImagePress }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const goToNextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const goToPreviousImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  if (!images || images.length === 0) {
    return (
      <View style={styles.noImagesContainer}>
        <Ionicons name="image-outline" size={50} color={theme.colors.borderColor} />
        <Text style={styles.noImagesText}>No images available</Text>
      </View>
    );
  }

  const mainImageUri = images[currentImageIndex];

  return (
    <View style={styles.container}>
      {/* Main Image Display */}
      <TouchableOpacity
        style={styles.mainImageContainer}
        onPress={() => onImagePress && onImagePress(images, currentImageIndex)}
        activeOpacity={0.9}
      >
        <Image source={{ uri: mainImageUri }} style={styles.mainImage} />
        {images.length > 1 && (
          <>
            <TouchableOpacity onPress={goToPreviousImage} style={[styles.arrowButton, styles.leftArrow]}>
              <Ionicons name="chevron-back-outline" size={30} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToNextImage} style={[styles.arrowButton, styles.rightArrow]}>
              <Ionicons name="chevron-forward-outline" size={30} color="white" />
            </TouchableOpacity>
          </>
        )}
      </TouchableOpacity>

      {/* Thumbnails */}
      {images.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailsContainer}>
          {images.map((imageUri, index) => (
            <TouchableOpacity
              key={imageUri + index}
              onPress={() => {
                setCurrentImageIndex(index);
              }}
              style={[
                styles.thumbnailWrapper,
                index === currentImageIndex && styles.thumbnailSelected,
              ]}
            >
              <Image source={{ uri: imageUri }} style={styles.thumbnailImage} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: theme.spacing(2),
  },
  noImagesContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.md,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    marginBottom: theme.spacing(2),
  },
  noImagesText: {
    marginTop: theme.spacing(1),
    color: theme.colors.bodyText,
    fontSize: 16,
  },
  mainImageContainer: {
    width: '100%',
    aspectRatio: 16 / 9, // Common aspect ratio for images
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  arrowButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 5,
    zIndex: 1,
  },
  leftArrow: {
    left: theme.spacing(1),
  },
  rightArrow: {
    right: theme.spacing(1),
  },
  thumbnailsContainer: {
    flexDirection: 'row',
    paddingVertical: theme.spacing(0.5),
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    marginRight: theme.spacing(1),
    borderColor: 'transparent',
    borderWidth: 2,
    backgroundColor: theme.colors.borderColor,
  },
  thumbnailSelected: {
    borderColor: theme.colors.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});

export default ProjectGallery;
