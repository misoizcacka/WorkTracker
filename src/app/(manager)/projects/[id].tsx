import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  useWindowDimensions,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Text } from '~/components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Ionicons } from '@expo/vector-icons';
import { MapView, Marker } from '../../../components/MapView';
import { EmbedMapView } from '../../../components/EmbedMapView.web';
import ImageCarouselModal from '../../../components/ImageCarouselModal';
import ProjectGallery from '../../../components/ProjectGallery';
import MessageInput from '../../../components/MessageInput';
import { ProjectsContext, ProjectMessage } from '~/context/ProjectsContext';
import { useSession } from '~/context/AuthContext';



export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useSession();
  const { projects, isLoading: isProjectsLoading, getProjectMessages, sendTextMessage, sendImageMessage } = useContext(ProjectsContext)!;
  const project = projects.find((p) => p.id === id as string);

  const MESSAGES_PER_PAGE = 20; // Define messages per page

  const [allMessages, setAllMessages] = useState<ProjectMessage[]>([]); // Renamed from 'messages'
  const [initialMessagesLoading, setInitialMessagesLoading] = useState(true); // For initial load
  const [hasMoreMessages, setHasMoreMessages] = useState(true); // Whether more messages can be loaded
  const [isFetchingMoreMessages, setIsFetchingMoreMessages] = useState(false); // For loading more messages
  
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  const [isModalVisible, setModalVisible] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [initialModalIndex, setInitialModalIndex] = useState(0);

  const flatListRef = useRef<FlatList<ProjectMessage>>(null);

  const openImageModal = (images: string[], index: number) => {
    setModalImages(images);
    setInitialModalIndex(index);
    setModalVisible(true);
  };

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
        ? fetchedMessages
        : [...prevMessages, ...fetchedMessages]
      );
      setHasMoreMessages(newHasMore);
      flatListRef.current?.scrollToEnd({ animated: false }); // Scroll to bottom on initial load
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

  const handleSendMessage = async (text: string, imageUris: string[]) => {
    if (!project || (text.trim() === '' && imageUris.length === 0)) return;

    try {
      if (text.trim() !== '') {
        await sendTextMessage(project.id, text.trim());
      }
      if (imageUris.length > 0) {
        for (const imageUri of imageUris) {
          await sendImageMessage(project.id, imageUri);
        }
      }
      await loadMessages();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };
  
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

  if (isProjectsLoading && !project) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!project) {
    return (
      <AnimatedScreen>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.title} fontType="bold">Project not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: theme.colors.primary, marginTop: 10 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </AnimatedScreen>
    );
  }

  const PageHeader = () => (
    <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.headingText} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing(1) }}>
                <View style={[styles.colorIndicator, { backgroundColor: project.color }]} />
                <Text style={styles.headerTitle} fontType="bold">{project.name}</Text>
            </View>
            <TouchableOpacity onPress={handleMapPress} style={styles.addressContainer}>
                <Ionicons name="location-outline" size={18} color={theme.colors.headingText} />
                <Text style={styles.headerAddress} fontType="regular">{project.address}</Text>
            </TouchableOpacity>
        </View>
    </View>
  );

  const renderMessage = ({ item }: { item: ProjectMessage }) => {
    const isMyMessage = item.sender_id === user?.id;
    const messageBubbleStyle = isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble;
    const messageTextStyle = isMyMessage ? styles.myMessageText : styles.otherMessageText;

    return (
      <View style={[styles.messageWrapper, isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer]}>
        <View style={[styles.messageBubble, messageBubbleStyle]}>
          {!isMyMessage && <Text style={styles.senderName} fontType="bold">{item.employees?.full_name || 'Unknown User'}</Text>}
          {item.type === 'text' && <Text style={messageTextStyle} fontType="regular">{item.text}</Text>}
          {item.type === 'image' && item.image_url && (
            <TouchableOpacity onPress={() => openImageModal([item.image_url!], 0)}>
              <Image source={{ uri: item.image_url }} style={styles.messageImage} />
            </TouchableOpacity>
          )}
          <Text style={[styles.timestamp, isMyMessage ? styles.myTimestamp : styles.otherTimestamp]}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
      </View>
    );
  };
  
  const ProjectDetails = () => (
    <ScrollView style={styles.detailsColumn}>
      <Card style={styles.card}>
        <Text style={styles.cardTitle} fontType="bold">Project Overview</Text>
        <Text style={styles.explanationText} fontType="regular">{project.explanation}</Text>
      </Card>

      {project.photos && project.photos.length > 0 && (
              <Card style={styles.card}>
                <Text style={styles.cardTitle} fontType="bold">Project Images</Text>

                <ProjectGallery images={project.photos} onImagePress={openImageModal} />
              </Card>      )}

      <Card style={styles.card}>
        <Text style={styles.cardTitle} fontType="bold">Location</Text>
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

      {!isLargeScreen && <Text style={styles.discussionSectionTitle} fontType="bold">Discussion</Text>}
    </ScrollView>
  );

  const Discussion = () => (
    <View style={styles.discussionContainer}>
        {initialMessagesLoading ? (
            <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.colors.primary} />
        ) : allMessages.length === 0 ? (
            <View style={styles.emptyDiscussionContainer}>
                <Text style={styles.emptyDiscussionText}>No messages yet.</Text>
            </View>
        ) : (
            <FlatList
                ref={flatListRef}
                data={allMessages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messageListContainer}
                inverted={true}
                onEndReached={loadMoreMessages}
                onEndReachedThreshold={0.5}
                ListFooterComponent={() => (
                    isFetchingMoreMessages ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 10 }} />
                    ) : null
                )}
            />
        )}
    </View>
  )

  return (
    <AnimatedScreen>
        <PageHeader />
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}>
            {isLargeScreen ? (
                <View style={styles.largeScreenLayout}>
                    <ProjectDetails/>
                    <View style={{flex: 1}}>
                      <Discussion/>
                      <MessageInput onSendMessage={handleSendMessage} />
                    </View>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    {initialMessagesLoading ? (
                        <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.colors.primary} />
                    ) : allMessages.length === 0 ? (
                        <ScrollView contentContainerStyle={styles.messageListContainer}>
                            <ProjectDetails />
                            <View style={styles.emptyDiscussionContainer}>
                                <Text style={styles.emptyDiscussionText}>No messages yet.</Text>
                            </View>
                        </ScrollView>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={allMessages}
                            renderItem={renderMessage}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.messageListContainer}
                            inverted={true}
                            onEndReached={loadMoreMessages}
                            onEndReachedThreshold={0.5}
                            ListHeaderComponent={<ProjectDetails />}
                            ListFooterComponent={() => (
                                isFetchingMoreMessages ? (
                                    <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 10 }} />
                                ) : null
                            )}
                        />
                    )}
                    <MessageInput onSendMessage={handleSendMessage} />
                </View>
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
        padding: theme.spacing(3),
        borderRightWidth: 1,
        borderRightColor: theme.colors.borderColor,
    },
    discussionSectionTitle: {
        fontSize: theme.fontSizes.lg,
        color: theme.colors.headingText,
        marginTop: theme.spacing(3),
        marginBottom: theme.spacing(2),
        paddingHorizontal: theme.spacing(2), // Add horizontal padding for consistency
    },
    pageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing(3),
        paddingHorizontal: theme.spacing(3),
        borderBottomWidth: 1,
        borderColor: theme.colors.borderColor,
    },
    backButton: {
        marginRight: theme.spacing(2),
    },
    headerTextContainer: {
        // You can add max-width and margin auto for centered content on very wide screens
    },
    headerTitle: {
        fontSize: theme.fontSizes.xl,
        color: theme.colors.headingText,
    },
    colorIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: theme.spacing(2),
    },
    headerAddress: {
        color: theme.colors.headingText,
        marginLeft: theme.spacing(1),
        fontSize: theme.fontSizes.sm,
        opacity: 0.8,
    },
    addressContainer: { // Re-adding the addressContainer style
        flexDirection: 'row',
        alignItems: 'center',
        // marginBottom: theme.spacing(2), // Removed as it's part of the header now
    },
    addressText: { // Re-adding the addressText style
        color: theme.colors.headingText,
        marginLeft: theme.spacing(1),
        fontSize: theme.fontSizes.md,
        opacity: 0.8,
    },
    title: {
        fontSize: theme.fontSizes.xl,
        color: theme.colors.headingText,
        marginBottom: theme.spacing(0.5),
    },
    card: {
        marginBottom: theme.spacing(2),
    },
    cardTitle: {
        fontSize: theme.fontSizes.lg,
        color: theme.colors.headingText,
        marginBottom: theme.spacing(2),
    },
    explanationText: {
        fontSize: theme.fontSizes.md,
        color: theme.colors.bodyText,
        lineHeight: 24,
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
        justifyContent: 'flex-end',
    },
    emptyDiscussionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyDiscussionText: {
        textAlign: 'center',
        color: theme.colors.bodyText,
        fontSize: theme.fontSizes.md,
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
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 22,
        maxWidth: '100%', // Ensure bubble does not exceed parent
    },
    myMessageBubble: {
        backgroundColor: theme.colors.primary,
        borderBottomRightRadius: 6,
    },
    otherMessageBubble: {
        backgroundColor: theme.colors.cardBackground,
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
        borderBottomLeftRadius: 6,
    },
    myMessageText: {
        color: 'white',
        fontSize: theme.fontSizes.md,
    },
    otherMessageText: {
        color: theme.colors.headingText,
        fontSize: theme.fontSizes.md,
    },
    senderName: {
        fontSize: theme.fontSizes.sm,
        color: theme.colors.headingText,
        marginBottom: 6,
    },
    timestamp: {
        fontSize: theme.fontSizes.xs,
        opacity: 0.7,
        marginTop: 6,
    },
    myTimestamp: {
        alignSelf: 'flex-end',
        color: 'rgba(255,255,255,0.8)'
    },
    otherTimestamp: {
        alignSelf: 'flex-start',
        color: theme.colors.bodyText,
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: theme.radius.md,
        marginTop: 8,
    },
});
