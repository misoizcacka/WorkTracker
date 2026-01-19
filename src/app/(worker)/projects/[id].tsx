// THIS FILE IS USING LIVE DATABASE DATA FOR THE DISCUSSION FEATURE.
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Text,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router'; // Added useRouter
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { MediaType } from 'expo-image-picker';
import { MapView, Marker } from '../../../components/MapView';
import ImageCarouselModal from '../../../components/ImageCarouselModal';
import { useProjects, ProjectMessage } from '../../../context/ProjectsContext';

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter(); // Initialize useRouter
  const { projects, isLoading, getProjectMessages, sendTextMessage, sendImageMessage } = useProjects();
  const project = projects.find((p) => p.id === id as string);

  const MESSAGES_PER_PAGE = 20; // Define messages per page

  const [allMessages, setAllMessages] = useState<ProjectMessage[]>([]); // Renamed from 'messages'
  const [initialMessagesLoading, setInitialMessagesLoading] = useState(true); // For initial load
  const [hasMoreMessages, setHasMoreMessages] = useState(true); // Whether more messages can be loaded
  const [isFetchingMoreMessages, setIsFetchingMoreMessages] = useState(false); // For loading more messages
  
  const [newMessage, setNewMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [initialModalIndex, setInitialModalIndex] = useState(0);

  const loadMessages = async (isInitialLoad = true) => {
    if (!project) return;
    if (isInitialLoad) {
      setInitialMessagesLoading(true);
      setAllMessages([]); // Clear messages on initial load
      setHasMoreMessages(true); // Reset hasMoreMessages
    } else {
      setIsFetchingMoreMessages(true);
    }
    
    try {
      const oldestMessageTimestamp = !isInitialLoad && allMessages.length > 0
        ? allMessages[allMessages.length - 1].created_at
        : undefined;

      const { messages: fetchedMessages, hasMore: newHasMore } = await getProjectMessages(
        project.id,
        MESSAGES_PER_PAGE,
        oldestMessageTimestamp
      );
      
      setAllMessages(prevMessages => isInitialLoad
        ? fetchedMessages.reverse() // Reverse for initial load to have oldest at top, newest at bottom
        : [...fetchedMessages.reverse(), ...prevMessages] // Prepend for load more
      );
      setHasMoreMessages(newHasMore);
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      if (isInitialLoad) {
        setInitialMessagesLoading(false);
      } else {
        setIsFetchingMoreMessages(false);
      }
    }
  };

  const loadMoreMessages = async () => {
    if (!project || !hasMoreMessages || isFetchingMoreMessages || initialMessagesLoading) {
      return;
    }
    await loadMessages(false);
  };

  useEffect(() => {
    if (project?.id) { // Only run if project.id is available
      loadMessages();
    }
  }, [project?.id]);

  const openImageModal = (images: string[], index: number) => {
    setModalImages(images);
    setInitialModalIndex(index);
    setModalVisible(true);
  };

  const handleSendMessage = async () => {
    if (!project || (newMessage.trim() === '' && selectedImages.length === 0)) return;

    try {
      if (newMessage.trim() !== '') {
        await sendTextMessage(project.id, newMessage.trim());
      }
      if (selectedImages.length > 0) {
        for (const imageUri of selectedImages) {
          await sendImageMessage(project.id, imageUri);
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setNewMessage('');
      setSelectedImages([]);
      // After sending, refresh messages to show the new one
      await loadMessages(true);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 1,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });

    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setSelectedImages(prev => [...prev, ...uris].slice(0, 5));
    }
  };

  const removeSelectedImage = (uri: string) => {
    setSelectedImages(prev => prev.filter(imageUri => imageUri !== uri));
  };

  const handleMapPress = () => {
    if (!project) return;
    const { latitude, longitude } = project.location;
    const label = project.name;
    const url = Platform.select({
      ios: `maps:0,0?q=${latitude},${longitude}(${label})`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
    });
    if (url) Linking.openURL(url);
  };

  if (isLoading && !project) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Project not found.</Text>
      </View>
    );
  }

  const renderMessage = ({ item }: { item: ProjectMessage }) => (
    <Card style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <Text style={styles.senderText}>{item.employees?.full_name || 'Unknown User'}</Text>
        <Text style={styles.timestampText}>{new Date(item.created_at).toLocaleTimeString()}</Text>
      </View>
      {item.type === 'text' && <Text>{item.text}</Text>}
      {item.type === 'image' && item.image_url && (
        <TouchableOpacity onPress={() => openImageModal([item.image_url!], 0)}>
          <Image source={{ uri: item.image_url }} style={styles.messageImage} />
        </TouchableOpacity>
      )}
    </Card>
  );

  const renderProjectImage = ({ item, index }: { item: string, index: number }) => (
    <TouchableOpacity onPress={() => openImageModal(project.photos, index)}>
      <Image source={{ uri: item }} style={styles.projectImage} />
    </TouchableOpacity>
  );

  const renderSelectedImagePreview = ({ item }: { item: string }) => (
    <View style={styles.previewImageContainer}>
      <Image source={{ uri: item }} style={styles.previewImage} />
      <TouchableOpacity onPress={() => removeSelectedImage(item)} style={styles.removeImageButton}>
        <Ionicons name="close-circle" size={24} color={theme.colors.danger} />
      </TouchableOpacity>
    </View>
  );

  const PageHeader = () => (
    <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.headingText} />
        </TouchableOpacity>
        <View style={[styles.colorIndicator, { backgroundColor: project.color || theme.colors.primary }]} />
        <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>{project.name}</Text>
            <Text style={styles.headerAddress} numberOfLines={1}>{project.address}</Text>
        </View>
    </View>
  );

  return (
    <AnimatedScreen>
      <PageHeader /> {/* New Header */}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 50 : 0}
      >
        <ScrollView style={{ flex: 1 }}>
          {/* Original headerCard content removed */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Overview</Text>
            <Text style={styles.explanationText}>{project.explanation}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Images</Text>
            <FlatList
              data={project.photos}
              renderItem={renderProjectImage}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.projectImageList}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <TouchableOpacity onPress={handleMapPress}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: project.location.latitude,
                  longitude: project.location.longitude,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
                scrollEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker
                  coordinate={project.location}
                  title={project.name}
                />
              </MapView>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Discussion</Text>
            {initialMessagesLoading ? (
              <ActivityIndicator style={{ marginVertical: 20 }} size="large" color={theme.colors.primary} />
            ) : allMessages.length === 0 ? (
              <Text style={styles.emptyDiscussionText}>No messages yet.</Text>
            ) : (
              <FlatList
                data={allMessages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                inverted={true}
                onEndReached={loadMoreMessages}
                onEndReachedThreshold={0.5} // When 50% from the end, load more
                ListFooterComponent={() => ( // This will appear at the top of an inverted list
                    isFetchingMoreMessages ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 10 }} />
                    ) : null
                )}
              />
            )}
          </View>
        </ScrollView>

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
              placeholder="Type a message or add an image..."
              placeholderTextColor={theme.colors.bodyText}
            />
            <TouchableOpacity onPress={handlePickImage} style={styles.iconButton}>
              <Ionicons name="image-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSendMessage} style={styles.iconButton}>
              <Ionicons name="send-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      <ImageCarouselModal
        visible={isModalVisible}
        images={modalImages}
        initialIndex={initialModalIndex}
        onClose={() => setModalVisible(false)}
      />
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  pageHeader: { // New header style
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    backgroundColor: 'white', // White background as requested
  },
  backButton: {
    marginRight: theme.spacing(2),
    padding: theme.spacing(1),
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing(2),
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22, // Matching manager's header title
    fontWeight: 'bold',
    color: theme.colors.headingText,
  },
  headerAddress: {
    color: theme.colors.bodyText,
    marginTop: 2,
    fontSize: 16, // Matching manager's header address
  },
  section: {
    marginTop: theme.spacing(2),
    paddingHorizontal: theme.spacing(2),
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
  },
  explanationText: {
    fontSize: 16,
    color: theme.colors.headingText,
    lineHeight: 24,
  },
  projectImageList: {
    paddingVertical: theme.spacing(1),
  },
  projectImage: {
    width: 280, // Fixed width
    height: 180, // Fixed height
    borderRadius: theme.radius.md,
    marginRight: theme.spacing(2),
  },
  map: {
    height: 200,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  listContainer: {
    paddingBottom: theme.spacing(2),
  },
  messageCard: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  senderText: {
    fontWeight: 'bold',
    color: theme.colors.headingText,
  },
  timestampText: {
    color: theme.colors.bodyText,
    fontSize: 12,
  },
  messageImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.radius.md,
    marginTop: 8,
  },
  inputContainer: {
    padding: theme.spacing(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
    backgroundColor: 'white',
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    color: theme.colors.headingText,
  },
  iconButton: {
    padding: theme.spacing(1),
    marginLeft: theme.spacing(1),
  },
  previewList: {
    marginBottom: theme.spacing(1),
  },
  previewImageContainer: {
    position: 'relative',
    marginRight: theme.spacing(1),
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: theme.radius.sm,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  emptyDiscussionText: {
    textAlign: 'center',
    color: theme.colors.bodyText,
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
    fontSize: 16,
  },
});