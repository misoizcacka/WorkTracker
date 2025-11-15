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
  Dimensions,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { MapView, Marker } from '../../../components/MapView';
import ImageCarouselModal from '../../../components/ImageCarouselModal';
import { ProjectsContext } from '../ProjectsContext';

const { width } = Dimensions.get('window');

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
              scrollEnabled={false}
              inverted={false}
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
              placeholderTextColor={theme.colors.textLight}
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
    backgroundColor: theme.colors.background,
  },
  headerCard: {
    padding: theme.spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightBorder,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  addressText: {
    color: theme.colors.textLight,
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
    color: theme.colors.text,
    marginBottom: theme.spacing(1),
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
    color: theme.colors.text,
  },
  timestampText: {
    color: theme.colors.textLight,
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
    borderTopColor: theme.colors.lightBorder,
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
    color: theme.colors.text,
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
