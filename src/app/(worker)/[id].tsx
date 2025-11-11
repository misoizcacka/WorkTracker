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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card } from '../../components/Card';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

// Mock data - in a real app, this would come from an API
const mockProjects = [
  { id: '1', name: 'Modern Villa Construction', address: '123 Luxury Lane, Berlin' },
  { id: '2', name: 'Downtown Office Renovation', address: '456 Business Blvd, Berlin' },
  { id: '3', name: 'Suburban Home Scaffolding', address: '789 Family Rd, Potsdam' },
  { id: '4', name: 'Historic Building Restoration', address: '101 History Alley, Berlin' },
];

const mockMessages = [
  { id: '1', text: 'Scaffolding is complete on the north side.', type: 'text', sender: 'John Doe', timestamp: '10:30 AM' },
  { id: '2', image: 'https://loremflickr.com/320/240/house', type: 'image', sender: 'John Doe', timestamp: '10:32 AM' },
  { id: '3', text: 'Found some damage on the east wall. Sending a picture.', type: 'text', sender: 'Jane Smith', timestamp: '11:05 AM' },
  { id: '4', image: 'https://loremflickr.com/320/240/scaffolding', type: 'image', sender: 'Jane Smith', timestamp: '11:06 AM' },
];

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const project = mockProjects.find((p) => p.id === id);

  const [messages, setMessages] = useState(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [image, setImage] = useState<string | null>(null);

  const handleSendMessage = () => {
    if (newMessage.trim() === '' && !image) return;

    const message = {
      id: (messages.length + 1).toString(),
      text: newMessage,
      type: image ? 'image' : 'text',
      image: image,
      sender: 'You', // In a real app, this would be the current user
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([message, ...messages]);
    setNewMessage('');
    setImage(null);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  if (!project) {
    return (
      <View style={styles.container}>
        <Text>Project not found.</Text>
      </View>
    );
  }

  const renderMessage = ({ item }) => (
    <Card style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <Text style={styles.senderText}>{item.sender}</Text>
        <Text style={styles.timestampText}>{item.timestamp}</Text>
      </View>
      {item.type === 'text' && <Text>{item.text}</Text>}
      {item.type === 'image' && item.image && (
        <Image source={{ uri: item.image }} style={styles.messageImage} />
      )}
    </Card>
  );

  return (
    <AnimatedScreen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.headerCard}>
          <Text style={styles.title}>{project.name}</Text>
          <Text style={styles.addressText}>{project.address}</Text>
        </View>

        <Text style={styles.discussionTitle}>Discussion</Text>

        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          inverted
          style={{ flex: 1 }}
        />

        <View style={styles.inputContainer}>
          {image && <Image source={{ uri: image }} style={styles.previewImage} />}
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
      </KeyboardAvoidingView>
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
    borderBottomColor: theme.colors.border,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  discussionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    paddingHorizontal: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  addressText: {
    color: theme.colors.textLight,
    marginTop: 4,
    fontSize: 16,
  },
  listContainer: {
    padding: theme.spacing(2),
    flexGrow: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: 'white',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    color: theme.colors.text,
  },
  iconButton: {
    padding: theme.spacing(1),
    marginLeft: theme.spacing(1),
  },
  previewImage: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    marginRight: theme.spacing(1),
  },
});
