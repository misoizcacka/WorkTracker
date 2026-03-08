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
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../../../components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { MapView, Marker } from '../../../components/MapView';
import ImageCarouselModal from '../../../components/ImageCarouselModal';
import { useProjects, ProjectMessage } from '../../../context/ProjectsContext';
import moment from 'moment';

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { projects, isLoading, getProjectMessages, sendTextMessage, sendImageMessage } = useProjects();
  const project = projects.find((p) => p.id === id as string);

  const MESSAGES_PER_PAGE = 20;

  const [allMessages, setAllMessages] = useState<ProjectMessage[]>([]);
  const [initialMessagesLoading, setInitialMessagesLoading] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isFetchingMoreMessages, setIsFetchingMoreMessages] = useState(false);
  
  const [newMessage, setNewMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [initialModalIndex, setInitialModalIndex] = useState(0);

  const loadMessages = async (isInitialLoad = true) => {
    if (!project) return;
    if (isInitialLoad) {
      setInitialMessagesLoading(true);
      setAllMessages([]);
      setHasMoreMessages(true);
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
        ? fetchedMessages.reverse()
        : [...fetchedMessages.reverse(), ...prevMessages]
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
    if (project?.id) {
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
      await loadMessages(true);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  const PageHeader = () => (
    <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.headingText} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1} fontType='bold'>{project.name || ''}</Text>
            <View style={styles.headerAddressRow}>
              <Ionicons name="location-outline" size={14} color={theme.colors.bodyText} />
              <Text style={styles.headerAddress} numberOfLines={1} fontType='regular'> {project.address || ''}</Text>
            </View>
        </View>
        <View style={[styles.colorIndicator, { backgroundColor: project.color || theme.colors.primary }]} />
    </View>
  );

  const renderMessage = ({ item }: { item: ProjectMessage }) => (
    <Card style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <Text style={styles.senderText} fontType="bold">{item.employees?.full_name || 'Unknown User'}</Text>
        <Text style={styles.timestampText}>{moment(item.created_at).format('hh:mm A')}</Text>
      </View>
      {item.type === 'text' && <Text fontType='regular' style={styles.messageText}>{item.text}</Text>}
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

  return (
    <AnimatedScreen>
      <PageHeader />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <FlatList
          ListHeaderComponent={
            <View style={styles.headerSections}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle} fontType='bold'>Project Overview</Text>
                <Card style={styles.overviewCard}>
                  <Text style={styles.explanationText} fontType='regular'>{project.explanation || 'No project description provided.'}</Text>
                </Card>
              </View>

              {project.photos && project.photos.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle} fontType='bold'>Project Images</Text>
                  <FlatList
                    data={project.photos}
                    renderItem={renderProjectImage}
                    keyExtractor={(item, index) => index.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.projectImageList}
                  />
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle} fontType='bold'>Location</Text>
                <TouchableOpacity onPress={handleMapPress} style={styles.mapContainer}>
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: project.location.latitude,
                      longitude: project.location.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
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
                  <View style={styles.mapOverlay}>
                    <Text style={styles.mapOverlayText} fontType="bold">OPEN IN MAPS</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle} fontType='bold'>Discussion</Text>
              </View>
            </View>
          }
          data={allMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          onEndReached={loadMoreMessages}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => (
              isFetchingMoreMessages ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 10 }} />
              ) : null
          )}
          ListEmptyComponent={() => (
            initialMessagesLoading ? (
              <ActivityIndicator style={{ marginVertical: 20 }} size="large" color={theme.colors.primary} />
            ) : (
              <Text style={styles.emptyDiscussionText} fontType='regular'>No messages yet.</Text>
            )
          )}
        />

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
            <TouchableOpacity onPress={handlePickImage} style={styles.iconButton}>
              <Ionicons name="add-circle-outline" size={30} color={theme.colors.primary} />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { fontSize: theme.fontSizes.md, fontFamily: theme.font.regular }]}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor={theme.colors.disabledText}
              multiline
            />
            <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
              <Ionicons name="send" size={20} color="white" />
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
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    backgroundColor: theme.colors.cardBackground,
  },
  backButton: {
    marginRight: theme.spacing(1),
    padding: theme.spacing(1),
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: theme.spacing(2),
    borderWidth: 2,
    borderColor: 'white',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
  },
  headerAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  headerAddress: {
    color: theme.colors.bodyText,
    fontSize: theme.fontSizes.sm,
  },
  headerSections: {
    paddingHorizontal: 0,
  },
  section: {
    marginTop: theme.spacing(3),
    paddingHorizontal: theme.spacing(3),
  },
  sectionTitle: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1.5),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  overviewCard: {
    padding: theme.spacing(2.5),
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  explanationText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
    lineHeight: 24,
  },
  projectImageList: {
    paddingVertical: theme.spacing(1),
  },
  projectImage: {
    width: 280,
    height: 180,
    borderRadius: theme.radius.lg,
    marginRight: theme.spacing(2),
  },
  mapContainer: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    height: 200,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(0.5),
    borderRadius: theme.radius.pill,
  },
  mapOverlayText: {
    color: 'white',
    fontSize: 10,
  },
  listContainer: {
    paddingHorizontal: theme.spacing(3),
    paddingBottom: theme.spacing(4),
  },
  messageCard: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    backgroundColor: theme.colors.cardBackground,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  senderText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.primary,
  },
  timestampText: {
    color: theme.colors.disabledText,
    fontSize: 10,
  },
  messageText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  messageImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.radius.md,
    marginTop: 8,
  },
  inputContainer: {
    padding: theme.spacing(2),
    paddingBottom: Platform.OS === 'ios' ? theme.spacing(4) : theme.spacing(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
    backgroundColor: theme.colors.cardBackground,
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: theme.colors.pageBackground,
    borderRadius: 22,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: 10,
    color: theme.colors.headingText,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  iconButton: {
    paddingBottom: 6,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
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
    color: theme.colors.disabledText,
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
    fontSize: theme.fontSizes.md,
  },
});
