import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, FlatList, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { MediaType } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { theme } from '../theme';

interface MessageInputProps {
  onSendMessage: (message: string, imageUris: string[]) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage }) => {
  const [newMessage, setNewMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 1,
      allowsMultipleSelection: true,
      base64: true, // Request base64 directly from ImagePicker
    });

    if (!result.canceled) {
      const processedImages = await Promise.all(result.assets.map(async (asset) => {
        if (asset.type === 'image' && asset.uri) {
          if (asset.base64) {
            // ImagePicker returned base64 directly
            return `data:image/jpeg;base64,${asset.base64}`;
          } else if (Platform.OS === 'web' && asset.uri.startsWith('blob:')) {
            // Fallback for web if base64: true didn't yield base64 directly from blob
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: 'base64',
            });
            // Determine image type dynamically if possible, or default to jpeg
            return `data:image/jpeg;base64,${base64}`;
          }
          return asset.uri; // Native file: URIs or http(s): URIs
        }
        return null;
      }));

      const validImages = processedImages.filter(uri => uri !== null) as string[];
      setSelectedImages(prev => [...prev, ...validImages]);
    }
  };

  const removeSelectedImage = (uri: string) => {
    setSelectedImages(prev => prev.filter(imageUri => imageUri !== uri));
  };

  const handleSend = () => {
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage === '' && selectedImages.length === 0) return;

    onSendMessage(trimmedMessage, selectedImages);
    setNewMessage('');
    setSelectedImages([]);
  };

  const renderSelectedImagePreview = ({ item }: { item: string }) => {
    console.log("Rendering preview image with URI:", item); // Log 2
    return (
      <View style={styles.previewImageContainer}>
        <Image source={{ uri: item }} style={styles.previewImage} />
        <TouchableOpacity onPress={() => removeSelectedImage(item)} style={styles.removeImageButton} accessibilityRole="button">
          <Ionicons name="close-circle" size={24} color={theme.colors.danger} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.inputContainer}>
      {selectedImages.length > 0 && (
        <FlatList
          data={selectedImages}
          renderItem={renderSelectedImagePreview}
          keyExtractor={(item) => item}
          horizontal
          style={styles.previewList}
          showsHorizontalScrollIndicator={false}
        />
      )}
      <View style={styles.textInputRow}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.bodyText}
          multiline
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity onPress={handlePickImage} style={styles.iconButton} accessibilityRole="button">
          <Ionicons name="image-outline" size={24} color={theme.colors.iconColor} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSend} style={styles.sendButton} accessibilityRole="button">
          <Ionicons name="paper-plane" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    paddingTop: theme.spacing(1),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing(1),
    minHeight: 45,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: 'transparent',
    paddingHorizontal: theme.spacing(1),
    color: theme.colors.headingText,
    fontSize: 16,
  },
  iconButton: {
    padding: theme.spacing(1),
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing(1),
  },
  previewList: {
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  previewImageContainer: {
    position: 'relative',
    marginRight: 8,
    width: 60,
    height: 60,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
});

export default MessageInput;