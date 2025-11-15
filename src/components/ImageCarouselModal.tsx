import React from 'react';
import { Modal, View, Image, StyleSheet, FlatList, Dimensions, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

const { width, height } = Dimensions.get('window');

interface ImageCarouselModalProps {
  visible: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function ImageCarouselModal({ visible, images, initialIndex, onClose }: ImageCarouselModalProps) {
  return (
    <Modal visible={visible} transparent={true} onRequestClose={onClose} animationType="fade">
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={32} color="white" />
        </TouchableOpacity>
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(data, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.imageContainer}>
              <Image source={{ uri: item }} style={styles.image} resizeMode="contain" />
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing(5),
    right: theme.spacing(2),
    zIndex: 1,
  },
  imageContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
