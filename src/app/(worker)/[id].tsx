import React, { useState } from 'react';
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
  Dimensions,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card } from '../../components/Card';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { MapView, Marker } from '../../components/MapView';
import ImageCarouselModal from '../../components/ImageCarouselModal';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  text?: string;
  type: 'text' | 'image';
  image?: string | null;
  sender: string;
  timestamp: string;
}

// Mock data - in a real app, this would come from an API
const mockProjects = [
  {
    id: '1',
    name: 'Modern Villa Construction',
    address: '123 Luxury Lane, Berlin',
    explanation:
      'This project involves the construction of a high-end modern villa. Key tasks include laying the foundation, erecting the steel frame, and installing glass curtain walls. Attention to detail is paramount.',
    pictures: [
      'https://loremflickr.com/640/480/villa,construction/all',
      'https://loremflickr.com/640/480/villa,building/all',
      'https://loremflickr.com/640/480/villa,architecture/all',
    ],
    location: {
      latitude: 52.52,
      longitude: 13.405,
    },
  },
  {
    id: '2',
    name: 'Downtown Office Renovation',
    address: '456 Business Blvd, Berlin',
    explanation:
      'Renovation of a 10-story office building. The focus is on modernizing the interior, upgrading the HVAC system, and improving energy efficiency. Work needs to be completed floor by floor.',
    pictures: [
      'https://loremflickr.com/640/480/office,renovation/all',
      'https://loremflickr.com/640/480/office,interior/all',
    ],
    location: {
      latitude: 52.516,
      longitude: 13.3777,
    },
  },
  {
    id: '3',
    name: 'Suburban Home Scaffolding',
    address: '789 Family Rd, Potsdam',
    explanation:
      'Erect scaffolding around a two-story suburban home for roof and facade repairs. Safety protocols must be strictly followed. The project is expected to take one week.',
    pictures: [
      'https://loremflickr.com/640/480/house,scaffolding/all',
    ],
    location: {
      latitude: 52.4,
      longitude: 13.06,
    },
  },
  {
    id: '4',
    name: 'Historic Building Restoration',
    address: '101 History Alley, Berlin',
    explanation:
      "Restoration of a 19th-century building. This requires careful handling of original materials and adherence to historical preservation guidelines. The sandstone facade needs special attention.",
    pictures: [
      'https://loremflickr.com/640/480/historic,building/all',
      'https://loremflickr.com/640/480/building,restoration/all',
    ],
    location: {
      latitude: 52.524,
      longitude: 13.41,
    },
  },
];

const mockMessages: Message[] = [
  { id: '1', text: 'Scaffolding is complete on the north side.', type: 'text', sender: 'John Doe', timestamp: '10:30 AM' },
  { id: '2', image: 'https://loremflickr.com/640/480/house', type: 'image', sender: 'John Doe', timestamp: '10:32 AM' },
  { id: '3', text: 'Found some damage on the east wall. Sending a picture.', type: 'text', sender: 'Jane Smith', timestamp: '11:05 AM' },
  { id: '4', image: 'https://loremflickr.com/640/480/scaffolding', type: 'image', sender: 'Jane Smith', timestamp: '11:06 AM' },
];

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const project = mockProjects.find((p) => p.id === id);

  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [initialModalIndex, setInitialModalIndex] = useState(0);

  const openImageModal = (images: string[], index: number) => {
    setModalImages(images);
    setInitialModalIndex(index);
    setModalVisible(true);
  };

  const handleSendMessage = () => {
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage === '' && selectedImages.length === 0) return;

    let newMessages: Message[] = [];

    // Create messages for images
    if (selectedImages.length > 0) {
      newMessages = selectedImages.map((uri, index) => ({
        id: (messages.length + index + 1).toString(),
        type: 'image',
        image: uri,
        sender: 'You',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
    }

    // Create message for text
    if (trimmedMessage !== '') {
      const textMessage: Message = {
        id: (messages.length + newMessages.length + 1).toString(),
        text: trimmedMessage,
        type: 'text',
        sender: 'You',
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

  const renderMessage = ({ item }: { item: Message }) => (
    <Card style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <Text style={styles.senderText}>{item.sender}</Text>
        <Text style={styles.timestampText}>{item.timestamp}</Text>
      </View>
      {item.type === 'text' && <Text>{item.text}</Text>}
      {item.type === 'image' && item.image && (
        <TouchableOpacity onPress={() => openImageModal([item.image!], 0)}>
          <Image source={{ uri: item.image }} style={styles.messageImage} />
        </TouchableOpacity>
      )}
    </Card>
  );

  const renderProjectImage = ({ item, index }: { item: string, index: number }) => (
    <TouchableOpacity onPress={() => openImageModal(project.pictures, index)}>
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView style={{ flex: 1 }}>
          <View style={styles.headerCard}>
            <Text style={styles.title}>{project.name}</Text>
            <Text style={styles.addressText}>{project.address}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Overview</Text>
            <Text style={styles.explanationText}>{project.explanation}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Images</Text>
            <FlatList
              data={project.pictures}
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
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              scrollEnabled={false} // Disable scroll for this list
              inverted={false} // No longer inverted as the main scrollview handles it
            />
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
  headerCard: {
    padding: theme.spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.headingText,
  },
  addressText: {
    color: theme.colors.bodyText,
    marginTop: 4,
    fontSize: 16,
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
    width: width * 0.7,
    height: width * 0.5,
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
});
