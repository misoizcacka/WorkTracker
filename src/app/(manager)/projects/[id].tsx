import React, { useState, useContext, useRef } from 'react';
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
  useWindowDimensions,
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
import ProjectGallery from '../../../components/ProjectGallery';
import MessageInput from '../../../components/MessageInput';
import { ProjectsContext } from '~/context/ProjectsContext';

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
  const { projects, updateProject } = useContext(ProjectsContext)!;
  const project = projects.find((p) => p.id === id);

  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  const [messages, setMessages] = useState<Message[]>(mockMessages);
  // Removed newMessage, selectedImages states
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [initialModalIndex, setInitialModalIndex] = useState(0);

  const flatListRef = useRef<FlatList<Message>>(null);

  if (!project) {
    return (
      <AnimatedScreen>
        <View style={styles.container}>
          <Text style={styles.title}>Project not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: theme.colors.primary, marginTop: 10 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </AnimatedScreen>
    );
  }

  const openImageModal = (images: string[], index: number) => {
    setModalImages(images);
    setInitialModalIndex(index);
    setModalVisible(true);
  };

  const handleSendMessage = (text: string, imageUris: string[]) => {
    // text and imageUris are now passed from MessageInput
    const trimmedMessage = text.trim();
    if (trimmedMessage === '' && imageUris.length === 0) return;

    let newMessages: Message[] = [];

    if (trimmedMessage !== '') {
        const textMessage: Message = {
            id: `msg-${Date.now()}-text`,
            text: trimmedMessage,
            type: 'text',
            sender: 'You (Manager)',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        newMessages.push(textMessage);
    }
    
    if (imageUris.length > 0) {
      const imageMessages: Message[] = imageUris.map((uri, index) => ({
        id: `msg-${Date.now()}-img-${index}`,
        type: 'image',
        image: uri,
        sender: 'You (Manager)',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      newMessages.push(...imageMessages);
    }

    setMessages(prevMessages => [...newMessages, ...prevMessages]);
  };

  // Removed handlePickImage and removeSelectedImage functions

  const handleMapPress = () => {
    if (!project) return;
    const { latitude, longitude } = project.location;
    const label = project.name;
    const url = Platform.select({
      ios: `maps:0,0?q=${latitude},${longitude}(${label})`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
      web: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    });
    if (url) Linking.openURL(url);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender === 'You (Manager)';
    const messageBubbleStyle = isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble;
    const messageTextStyle = isMyMessage ? styles.myMessageText : styles.otherMessageText;

    return (
      <View style={[styles.messageWrapper, isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer]}>
        <View style={[styles.messageBubble, messageBubbleStyle]}>
          {!isMyMessage && <Text style={styles.senderName}>{item.sender}</Text>}
          {item.type === 'text' && <Text style={messageTextStyle}>{item.text}</Text>}
          {item.type === 'image' && item.image && (
            <TouchableOpacity onPress={() => openImageModal([item.image!], 0)}>
              <Image source={{ uri: item.image }} style={styles.messageImage} />
            </TouchableOpacity>
          )}
          <Text style={[styles.timestamp, isMyMessage ? styles.myTimestamp : styles.otherTimestamp]}>{item.timestamp}</Text>
        </View>
      </View>
    );
  };
  
  // Removed renderSelectedImagePreview as it's now in MessageInput

  const ProjectDetails = () => (
    <ScrollView style={styles.detailsColumn}>
      <Text style={styles.title}>{project.name}</Text>
      <TouchableOpacity onPress={handleMapPress} style={styles.addressContainer}>
        <Ionicons name="location-outline" size={18} color={theme.colors.bodyText} />
        <Text style={styles.addressText}>{project.address}</Text>
      </TouchableOpacity>
      
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Project Overview</Text>
        <Text style={styles.explanationText}>{project.explanation}</Text>
      </Card>

      {project.photos && project.photos.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Project Images</Text>
          <ProjectGallery images={project.photos} onImagePress={openImageModal} />
        </Card>
      )}

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Location</Text>
        <TouchableOpacity onPress={handleMapPress}>
            <View style={styles.mapWrapper}>
                {Platform.OS === 'web' ? (
                    <EmbedMapView latitude={project.location.latitude} longitude={project.location.longitude} name={project.name} />
                ) : (
                    <MapView initialRegion={{ latitude: project.location.latitude, longitude: project.location.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02, }} scrollEnabled={false} pitchEnabled={false} rotateEnabled={false}>
                        <Marker coordinate={project.location} title={project.name} />
                    </MapView>
                )}
            </View>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );

  const Discussion = () => (
    <View style={styles.discussionContainer}>
        {isLargeScreen && <Text style={styles.cardTitle}>Discussion</Text>}
        <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageListContainer}
            inverted={true}
        />
        <MessageInput onSendMessage={handleSendMessage} />
    </View>
  )

  return (
    <AnimatedScreen>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}>
            {isLargeScreen ? (
                <View style={styles.largeScreenLayout}>
                    <ProjectDetails/>
                    <Discussion/>
                </View>
            ) : (
                <ScrollView>
                    <ProjectDetails/>
                    <Discussion/>
                </ScrollView>
            )}
        </KeyboardAvoidingView>
      <ImageCarouselModal visible={isModalVisible} images={modalImages} initialIndex={initialModalIndex} onClose={() => setModalVisible(false)} />
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.pageBackground,
    },
    largeScreenLayout: {
        flexDirection: 'row',
        flex: 1,
    },
    detailsColumn: {
        flex: 1,
        padding: theme.spacing(2),
        borderRightWidth: 1,
        borderRightColor: theme.colors.borderColor,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.headingText,
        marginBottom: theme.spacing(0.5), // Reduced margin to bring address closer
    },
    card: {
        marginBottom: theme.spacing(2),
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.headingText,
        marginBottom: theme.spacing(2),
    },
    explanationText: {
        fontSize: 16,
        color: theme.colors.bodyText,
        lineHeight: 24,
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing(2), // Add margin bottom to separate from next card
    },
    addressText: {
        color: theme.colors.bodyText,
        marginLeft: theme.spacing(1),
        fontSize: 16,
    },
    projectImage: {
        height: 200,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.borderColor
    },
    mapWrapper: {
        height: 250,
        borderRadius: theme.radius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
    },
    discussionContainer: {
        flex: 1,
        backgroundColor: theme.colors.pageBackground,
        padding: theme.spacing(2),
    },
    messageListContainer: {
        paddingTop: theme.spacing(2),
        flexGrow: 1,
    },
    messageWrapper: {
        marginVertical: 4,
        maxWidth: '80%',
    },
    myMessageContainer: {
        alignSelf: 'flex-end',
    },
    otherMessageContainer: {
        alignSelf: 'flex-start',
    },
    messageBubble: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 20,
    },
    myMessageBubble: {
        backgroundColor: theme.colors.primary,
        borderBottomRightRadius: 4,
    },
    otherMessageBubble: {
        backgroundColor: theme.colors.cardBackground,
        borderBottomLeftRadius: 4,
    },
    myMessageText: {
        color: 'white',
        fontSize: 16,
    },
    otherMessageText: {
        color: theme.colors.headingText,
        fontSize: 16,
    },
    senderName: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
        marginBottom: 4,
    },
    timestamp: {
        fontSize: 10,
        color: theme.colors.bodyText,
        marginTop: 4,
    },
    myTimestamp: {
        alignSelf: 'flex-end',
        color: 'rgba(255,255,255,0.7)'
    },
    otherTimestamp: {
        alignSelf: 'flex-start',
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: theme.radius.md,
        marginTop: 8,
    },
    // Removed input related styles
});

