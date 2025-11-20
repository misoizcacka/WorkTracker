import React, { useState, useContext } from 'react';
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
  useWindowDimensions, // Import useWindowDimensions
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { MapView, Marker } from '../../../components/MapView';
import { EmbedMapView } from '../../../components/EmbedMapView.web';
import ImageCarouselModal from '../../../components/ImageCarouselModal';
import { ProjectsContext } from '../ProjectsContext';

interface Message {
  id: string;
  text?: string;
  type: 'text' | 'image';
  image?: string | null;
  sender: string;
  timestamp: string;
}

const mockMessages: Message[] = [
  { id: '1', text: 'Scaffolding is complete on the north side.', type: 'text', sender: 'John Doe', timestamp: '10:30 AM' },
  { id: '2', image: 'https://loremflickr.com/640/480/house', type: 'image', sender: 'John Doe', timestamp: '10:32 AM' },
  { id: '3', text: 'Found some damage on the east wall. Sending a picture.', type: 'text', sender: 'Jane Smith', timestamp: '11:05 AM' },
  { id: '4', image: 'https://loremflickr.com/640/480/scaffolding', type: 'image', sender: 'Jane Smith', timestamp: '11:06 AM' },
];

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { projects } = useContext(ProjectsContext)!;
  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
      <View style={styles.container}>
        <Text>Project not found.</Text>
      </View>
    );
  }

  const { width } = useWindowDimensions(); // Use useWindowDimensions
  const isLargeScreen = width > 768; // Define a breakpoint for large screens

  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [initialModalIndex, setInitialModalIndex] = useState(0);
  const [currentProjectImageIndex, setCurrentProjectImageIndex] = useState(0);

  const handlePrevImage = () => {
    setCurrentProjectImageIndex((prevIndex) =>
      prevIndex === 0 ? project.photos.length - 1 : prevIndex - 1
    );
  };

  const handleNextImage = () => {
    setCurrentProjectImageIndex((prevIndex) =>
      prevIndex === project.photos.length - 1 ? 0 : prevIndex + 1
    );
  };

  const openImageModal = (images: string[], index: number) => {
    setModalImages(images);
    setInitialModalIndex(index);
    setModalVisible(true);
  };

  const handleSendMessage = () => {
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage === '' && selectedImages.length === 0) return;

    let newMessages: Message[] = [];

    if (selectedImages.length > 0) {
      newMessages = selectedImages.map((uri, index) => ({
        id: (messages.length + index + 1).toString(),
        type: 'image',
        image: uri,
        sender: 'You (Manager)',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
    }

    if (trimmedMessage !== '') {
      const textMessage: Message = {
        id: (messages.length + newMessages.length + 1).toString(),
        text: trimmedMessage,
        type: 'text',
        sender: 'You (Manager)',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      newMessages.push(textMessage);
    }

    setMessages(prevMessages => [...newMessages, ...prevMessages]);
    setNewMessage('');
    setSelectedImages([]);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsMultipleSelection: true,
    });

    if (!result.canceled) {
      setSelectedImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
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

  if (!project) {
    return (
      <View style={styles.container}>
        <Text>Project not found.</Text>
      </View>
    );
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender === 'You (Manager)';
    const messageBubbleStyle = isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble;
    const messageTextStyle = isMyMessage ? styles.myMessageText : styles.otherMessageText;
    const messageContainerAlignment = isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer;
    const timestampAlignment = isMyMessage ? styles.myTimestamp : styles.otherTimestamp;

    return (
      <View style={[styles.messageWrapper, messageContainerAlignment, isLargeScreen && styles.messageWrapperLargeScreen]}>
        <View style={[styles.messageBubble, messageBubbleStyle]}>
          {/* Sender name for incoming messages */}
          {!isMyMessage && <Text style={styles.senderName}>{item.sender}</Text>}

          {item.type === 'text' && <Text style={messageTextStyle}>{item.text}</Text>}
          {item.type === 'image' && item.image && (
            <TouchableOpacity onPress={() => openImageModal([item.image!], 0)}>
              <Image source={{ uri: item.image }} style={isLargeScreen ? styles.messageImageLarge : styles.messageImageSmall} />
            </TouchableOpacity>
          )}
          <Text style={[styles.timestamp, timestampAlignment]}>{item.timestamp}</Text>
        </View>
      </View>
    );
  };

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
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {isLargeScreen ? (
          <View style={styles.largeScreenLayout}> {/* New container for large screen layout */}
            {/* Details Column (scrollable) */}
            <ScrollView style={styles.detailsColumn}>
              <View style={styles.headerCard}>
                <Text style={styles.title}>{project.name}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Project Overview</Text>
                <Text style={styles.explanationText}>{project.explanation}</Text>
                <TouchableOpacity onPress={handleMapPress} style={styles.addressContainer}>
                  <Ionicons name="location-outline" size={18} color={theme.colors.bodyText} />
                  <Text style={styles.addressText}>{project.address}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Project Images</Text>
                <View style={styles.imageGalleryContainer}>
                  <TouchableOpacity onPress={handlePrevImage} style={styles.galleryNavButton}>
                    <Ionicons name="chevron-back-outline" size={30} color={theme.colors.iconColor} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openImageModal(project.photos, currentProjectImageIndex)} style={styles.currentImageWrapper}>
                    <Image
                      source={{ uri: project.photos[currentProjectImageIndex] }}
                      style={styles.projectImage}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleNextImage} style={styles.galleryNavButton}>
                    <Ionicons name="chevron-forward-outline" size={30} color={theme.colors.iconColor} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Location</Text>
                <TouchableOpacity onPress={handleMapPress} style={styles.mapWrapper}>
                  {Platform.OS === 'web' ? (
                    <EmbedMapView
                      latitude={project.location.latitude}
                      longitude={project.location.longitude}
                      name={project.name}
                    />
                  ) : (
                    <MapView
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
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Discussion Column (right side) */}
            <View style={styles.discussionColumn}>
              <View style={styles.discussionHeader}> {/* New header for discussion column */}
                <Text style={styles.sectionTitle}>Discussion</Text>
              </View>
                              <FlatList
                                data={messages}
                                renderItem={renderMessage}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.listContainer}
                                style={styles.messageList} // Use a specific style for the FlatList itself
                                scrollEnabled={true}
                                inverted={true}
                              />              <View style={styles.inputContainer}>
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
                    <Ionicons name="image-outline" size={24} color={theme.colors.iconColor} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
                    <Ionicons name="paper-plane" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }}> {/* Small screen content */}
            <ScrollView style={{ flex: 1 }}>
              <View style={styles.headerCard}>
                <Text style={styles.title}>{project.name}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Project Overview</Text>
                <Text style={styles.explanationText}>{project.explanation}</Text>
                <TouchableOpacity onPress={handleMapPress} style={styles.addressContainer}>
                  <Ionicons name="location-outline" size={18} color={theme.colors.bodyText} />
                  <Text style={styles.addressText}>{project.address}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Project Images</Text>
                <View style={styles.imageGalleryContainer}>
                  <TouchableOpacity onPress={handlePrevImage} style={styles.galleryNavButton}>
                    <Ionicons name="chevron-back-outline" size={30} color={theme.colors.iconColor} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openImageModal(project.photos, currentProjectImageIndex)} style={styles.currentImageWrapper}>
                    <Image
                      source={{ uri: project.photos[currentProjectImageIndex] }}
                      style={styles.projectImage}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleNextImage} style={styles.galleryNavButton}>
                    <Ionicons name="chevron-forward-outline" size={30} color={theme.colors.iconColor} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Location</Text>
                <TouchableOpacity onPress={handleMapPress} style={styles.mapWrapper}>
                  {Platform.OS === 'web' ? (
                    <EmbedMapView
                      latitude={project.location.latitude}
                      longitude={project.location.longitude}
                      name={project.name}
                    />
                  ) : (
                    <MapView
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
                  )}
                </TouchableOpacity>
              </View>

              <View style={[styles.section, { flex: 1 }]}> {/* Discussion section for small screens */}
                <Text style={styles.sectionTitle}>Discussion</Text>
                <FlatList
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContainer}
                  style={{ flex: 1 }} // Ensure it fills vertical space
                  scrollEnabled={true} // Enable scrolling for messages
                  inverted={true}
                />
              </View>
            </ScrollView>
            {/* Input Container for small screens */}
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
                  <Ionicons name="image-outline" size={24} color="#6b6b6b" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
                  <Ionicons name="paper-plane" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
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
  largeScreenContent: {
    flexDirection: 'row',
    flex: 1,
  },
  smallScreenContent: {
    flexDirection: 'column',
    flex: 1,
  },
  largeScreenLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  discussionColumn: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground, // Match theme background
  },
  discussionHeader: {
    padding: theme.spacing(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderColor,
    backgroundColor: theme.colors.cardBackground, // Use theme background
  },
  messageList: {
    flex: 1, // Ensure FlatList fills vertical space
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.pageBackground, // Use theme background
  },
  detailsColumn: {
    flex: 1,
    marginRight: theme.spacing(2),
    borderRightWidth: 1, // Vertical separator
    borderRightColor: theme.colors.borderColor,
  },

  fullWidth: {
    width: '100%',
  },
  headerCard: {
    padding: theme.spacing(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderColor,
    backgroundColor: theme.colors.cardBackground, // Solid background
    borderRadius: theme.radius.md, // Match common radius
    marginBottom: theme.spacing(2), // Add margin bottom for spacing
  },
  title: {
    fontSize: 24,
    fontWeight: '600', // Medium weight
    color: theme.colors.headingText,
  },
  addressText: {
    color: theme.colors.bodyText,
    marginLeft: 4, // Added margin for spacing from icon
    fontSize: 16,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  section: {
    marginTop: theme.spacing(2),
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1), // Add some vertical padding
  },
  sectionTitle: {
    fontSize: 18, // Adjusted to 18-20 range
    fontWeight: '600', // Medium weight
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
  map: {
    // MapView itself should take up all available space within its wrapper
    // No explicit width/height here, it will be handled by mapWrapper
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  mapWrapper: {
    height: 250, // Taller map container
    width: '100%', // Take full width of its parent
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  listContainer: {
    paddingVertical: 10, // Small vertical padding
    paddingHorizontal: 10, // Small horizontal padding
    backgroundColor: theme.colors.pageBackground, // Match theme background
    flexGrow: 1, // Ensure it fills vertical space
  },
  messageWrapper: {
    marginVertical: 3, // Small vertical spacing between messages
    maxWidth: '100%', // Default to full width for small screens
  },
  messageWrapperLargeScreen: {
    maxWidth: '60%', // Max width for large screens
  },
  myMessageContainer: {
    alignSelf: 'flex-end', // Align outgoing messages to the right
  },
  otherMessageContainer: {
    alignSelf: 'flex-start', // Align incoming messages to the left
  },
  messageBubble: {
    paddingVertical: 8, // Small padding inside bubbles
    paddingHorizontal: 12, // Small padding inside bubbles
    borderRadius: 12, // Rounded corners
    minWidth: 80, // Ensure bubble has a minimum width
  },
  myMessageBubble: {
    backgroundColor: theme.colors.primaryMuted, // Muted primary bubble for outgoing
    borderTopRightRadius: theme.radius.sm, // Consistent radius
  },
  otherMessageBubble: {
    backgroundColor: theme.colors.cardBackground, // Use card background for incoming
    borderTopLeftRadius: theme.radius.sm, // Consistent radius
  },
  myMessageText: {
    color: theme.colors.bodyText, // Body text color for outgoing
    fontWeight: '400', // Regular weight
  },
  otherMessageText: {
    color: theme.colors.headingText, // Heading text color for incoming
    fontWeight: '400', // Regular weight
  },
  senderName: {
    fontSize: 14,
    fontWeight: '500', // Medium weight
    color: theme.colors.primary, // Highlight sender name
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 10,
    color: theme.colors.bodyText, // Light gray text
    marginTop: 4,
  },
  myTimestamp: {
    alignSelf: 'flex-end', // Align timestamp to the right for outgoing
  },
  otherTimestamp: {
    alignSelf: 'flex-start', // Align timestamp to the left for incoming
  },
  messageImageSmall: {
    width: 180, // Fixed size for mobile
    height: 180, // Fixed size for mobile
    borderRadius: 8, // Rounded corners
    marginTop: 8,
  },
  messageImageLarge: {
    width: 200, // Fixed size for desktop
    height: 200, // Fixed size for desktop
    borderRadius: 8, // Rounded corners
    marginTop: 8,
  },
  inputContainer: {
    paddingHorizontal: theme.spacing(1), // Use theme spacing
    paddingVertical: theme.spacing(1), // Use theme spacing
    borderTopWidth: StyleSheet.hairlineWidth, // Add a subtle top border
    borderTopColor: theme.colors.borderColor, // Use theme border color
    backgroundColor: theme.colors.pageBackground, // Use theme page background
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground, // Use theme card background
    borderRadius: theme.radius.md, // Use theme border radius
    paddingHorizontal: theme.spacing(1), // Use theme spacing
    minHeight: theme.spacing(6), // Minimum height for the input bar
    ...theme.shadow.soft, // Add subtle shadow
  },
  input: {
    flex: 1,
    minHeight: theme.spacing(5), // Minimum height for text input
    maxHeight: theme.spacing(12), // Max height for multiline input
    backgroundColor: 'transparent', // Transparent background
    borderRadius: 0, // No border radius here
    paddingHorizontal: theme.spacing(1), // Use theme spacing
    color: theme.colors.headingText, // Use theme heading text color
    fontSize: 16,
  },
  iconButton: {
    padding: theme.spacing(1), // Use theme spacing
    marginLeft: theme.spacing(0.5), // Use theme spacing
  },
  sendButton: {
    width: theme.spacing(5), // Use theme spacing
    height: theme.spacing(5),
    borderRadius: theme.spacing(2.5),
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing(1),
  },
  previewList: {
    marginBottom: 8, // Small margin below previews
    paddingHorizontal: 10, // Match input container padding
  },
  previewImageContainer: {
    position: 'relative',
    marginRight: 8, // Small margin between previews
    width: 60, // Fixed width
    height: 60, // Fixed height
    borderRadius: 8, // Rounded corners
    overflow: 'hidden', // Ensure image respects border radius
  },
  previewImage: {
    width: '100%', // Fill container
    height: '100%', // Fill container
    resizeMode: 'cover', // Cover to ensure square aspect ratio
  },
  removeImageButton: {
    position: 'absolute',
    top: -8, // Adjust position
    right: -8, // Adjust position
    backgroundColor: theme.colors.cardBackground, // Use theme card background
    borderRadius: 12,
    padding: 2, // Small padding for the icon
  },
  imageGalleryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing(1),
    width: '100%',
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.cardBackground,
    ...theme.shadow.soft,
  },
  currentImageWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 250, // Fixed height for the gallery image
  },
  galleryNavButton: {
    padding: theme.spacing(1),
  },
  projectImage: {
    width: '100%', // Fill wrapper
    height: '100%', // Fill wrapper
    resizeMode: 'cover',
  },
});
