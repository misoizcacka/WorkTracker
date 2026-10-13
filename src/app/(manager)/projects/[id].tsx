import React, { useState, useContext, useEffect, useRef } from 'react';
import { compressImageAsync } from '~/utils/imageCompression';
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
import { useTranslation } from 'react-i18next';

type Tab = 'overview' | 'discussion';

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useSession();
  const { t } = useTranslation();
  const { projects, isLoading: isProjectsLoading, getProjectMessages, sendTextMessage, sendImageMessage } = useContext(ProjectsContext)!;
  const project = projects.find((p) => p.id === id as string);
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const MESSAGES_PER_PAGE = 20;
  const [allMessages, setAllMessages] = useState<ProjectMessage[]>([]);
  const [initialMessagesLoading, setInitialMessagesLoading] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isFetchingMoreMessages, setIsFetchingMoreMessages] = useState(false);

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
        project.id, MESSAGES_PER_PAGE, oldestMessageTimestamp
      );
      setAllMessages(prev => isInitialLoad ? fetchedMessages : [...prev, ...fetchedMessages]);
      setHasMoreMessages(newHasMore);
      flatListRef.current?.scrollToEnd({ animated: false });
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      isInitialLoad ? setInitialMessagesLoading(false) : setIsFetchingMoreMessages(false);
    }
  };

  useEffect(() => {
    if (project?.id) loadMessages();
  }, [project?.id]);

  const handleSendMessage = async (text: string, imageUris: string[]) => {
    if (!project || (text.trim() === '' && imageUris.length === 0)) return;
    try {
      if (text.trim() !== '') await sendTextMessage(project.id, text.trim());
      for (const uri of imageUris) {
        const compressed = await compressImageAsync(uri);
        await sendImageMessage(project.id, compressed);
      }
      await loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleMapPress = () => {
    if (!project) return;
    const { latitude, longitude } = project.location;
    const url = Platform.select({
      ios: `maps:0,0?q=${latitude},${longitude}(${project.name})`,
      android: `geo:0,0?q=${latitude},${longitude}(${project.name})`,
      web: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
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
          <Text style={styles.notFoundText} fontType="bold">{t('manager.projects.projectNotFound')}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.goBackLink}>
            <Text style={styles.goBackLinkText}>{t('manager.projects.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </AnimatedScreen>
    );
  }

  const hasPhoto = project.photos && project.photos.length > 0;
  const initials = project.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('');
  const isActive = project.status !== 'closed';

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview',    label: t('manager.projects.projectOverview'), icon: 'document-text-outline' },
    { key: 'discussion',  label: t('manager.projects.discussion'),      icon: 'chatbubbles-outline' },
  ];

  return (
    <AnimatedScreen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {/* ── Hero Header ── */}
        <View style={styles.hero}>
          {hasPhoto ? (
            <Image source={{ uri: project.photos[0] }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, styles.heroFallback, { backgroundColor: project.color || theme.colors.primary }]}>
              <Text style={styles.heroInitials} fontType="bold">{initials}</Text>
            </View>
          )}
          <View style={[StyleSheet.absoluteFillObject, styles.heroScrim]} />

          <TouchableOpacity onPress={() => router.back()} style={styles.heroBack}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>

          <View style={styles.heroMeta}>
            <View style={styles.heroTopRow}>
              <View style={[styles.statusPill, isActive ? styles.statusPillActive : styles.statusPillClosed]}>
                <Text style={styles.statusPillText} fontType="bold">
                  {isActive ? t('manager.projects.statusActive') : t('manager.projects.statusClosed')}
                </Text>
              </View>
              <View style={[styles.colorDot, { backgroundColor: project.color || theme.colors.primary }]} />
            </View>
            <Text style={styles.heroTitle} fontType="bold" numberOfLines={2}>{project.name}</Text>
            {project.address ? (
              <TouchableOpacity onPress={handleMapPress} style={styles.heroAddress}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.85)" />
                <Text style={styles.heroAddressText} fontType="regular" numberOfLines={1}>{project.address}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ── Tab Bar ── */}
        <View style={styles.tabBar}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={activeTab === tab.key ? theme.colors.headingText : theme.colors.disabledText}
              />
              <Text
                style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}
                fontType={activeTab === tab.key ? 'bold' : 'regular'}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <ScrollView style={styles.tabContent} contentContainerStyle={styles.overviewContent}>
            <View style={[styles.overviewLayout, isLargeScreen && styles.overviewLayoutLarge]}>
              {/* Left / main column */}
              <View style={[styles.overviewMain, isLargeScreen && styles.overviewMainLarge]}>
                {/* Description */}
                {project.explanation ? (
                  <View style={[styles.sectionCard, { marginBottom: theme.spacing(2) }]}>
                    <Text style={styles.sectionTitle} fontType="bold">{t('manager.projects.projectOverview')}</Text>
                    <Text style={styles.explanationText} fontType="regular">{project.explanation}</Text>
                  </View>
                ) : null}

                {/* Photo gallery — inline, not a separate tab */}
                {project.photos && project.photos.length > 0 && (
                  <View style={[styles.sectionCard, { marginBottom: theme.spacing(2) }]}>
                    <Text style={styles.sectionTitle} fontType="bold">{t('manager.projects.projectImages')}</Text>
                    <ProjectGallery images={project.photos} onImagePress={openImageModal} />
                  </View>
                )}

                {/* Empty state when no description and no photos */}
                {!project.explanation && (!project.photos || project.photos.length === 0) && (
                  <View style={styles.sectionCard}>
                    <View style={styles.emptyOverview}>
                      <Ionicons name="document-text-outline" size={40} color={theme.colors.borderColor} />
                      <Text style={styles.emptyTabText} fontType="regular">No description or photos yet.</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Right / side column — map */}
              <View style={[styles.overviewSide, isLargeScreen && styles.overviewSideLarge]}>
                <View style={styles.sectionCard}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionTitle} fontType="bold">{t('manager.projects.location')}</Text>
                    <TouchableOpacity onPress={handleMapPress} style={styles.openMapButton}>
                      <Ionicons name="open-outline" size={14} color={theme.colors.primary} />
                      <Text style={styles.openMapText} fontType="regular">Open</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.mapWrapper}>
                    {Platform.OS === 'web' ? (
                      <EmbedMapView latitude={project.location.latitude} longitude={project.location.longitude} name={project.name} />
                    ) : (
                      <MapView
                        initialRegion={{ latitude: project.location.latitude, longitude: project.location.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
                        scrollEnabled={false} pitchEnabled={false} rotateEnabled={false}
                      >
                        <Marker coordinate={project.location} title={project.name} />
                      </MapView>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        )}

        {/* ── Photos Tab removed — gallery lives in Overview ── */}

        {/* ── Discussion Tab ── */}
        {activeTab === 'discussion' && (
          <View style={styles.discussionWrapper}>
            {initialMessagesLoading ? (
              <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.colors.primary} />
            ) : allMessages.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.borderColor} />
                <Text style={styles.emptyTabText} fontType="regular">{t('manager.projects.noMessages')}</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={allMessages}
                renderItem={({ item }) => {
                  const isMe = item.sender_id === user?.id;
                  return (
                    <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
                      <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
                        {!isMe && (
                          <Text style={styles.senderName} fontType="bold">
                            {item.employees?.full_name || 'Unknown'}
                          </Text>
                        )}
                        {item.type === 'text' && (
                          <Text style={isMe ? styles.myMessageText : styles.otherMessageText} fontType="regular">
                            {item.text}
                          </Text>
                        )}
                        {item.type === 'image' && item.image_url && (
                          <TouchableOpacity onPress={() => openImageModal([item.image_url!], 0)}>
                            <Image source={{ uri: item.image_url }} style={styles.messageImage} />
                          </TouchableOpacity>
                        )}
                        <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.otherTimestamp]}>
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  );
                }}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.messageList}
                inverted
                onEndReached={() => {
                  if (hasMoreMessages && !isFetchingMoreMessages) loadMessages(false);
                }}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  isFetchingMoreMessages
                    ? <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 10 }} />
                    : null
                }
              />
            )}
            <MessageInput onSendMessage={handleSendMessage} />
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

  // ── Hero ──
  hero: {
    height: 200,
    position: 'relative',
    backgroundColor: theme.colors.borderColor,
  },
  heroFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInitials: {
    fontSize: 56,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 4,
  },
  heroScrim: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroBack: {
    position: 'absolute',
    top: theme.spacing(2),
    left: theme.spacing(2),
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMeta: {
    position: 'absolute',
    bottom: theme.spacing(2),
    left: theme.spacing(2),
    right: theme.spacing(2),
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(0.75),
  },
  statusPill: {
    paddingHorizontal: theme.spacing(1),
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  statusPillActive: { backgroundColor: 'rgba(22,163,74,0.8)' },
  statusPillClosed: { backgroundColor: 'rgba(0,0,0,0.4)' },
  statusPillText: { fontSize: theme.fontSizes.xs, color: 'white' },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  heroTitle: {
    fontSize: 22,
    color: 'white',
    marginBottom: theme.spacing(0.5),
  },
  heroAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroAddressText: {
    fontSize: theme.fontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },

  // ── Tab Bar ──
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing(1.75),
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.headingText,
  },
  tabLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.disabledText,
  },
  tabLabelActive: {
    color: theme.colors.headingText,
  },

  // ── Overview Tab ──
  tabContent: {
    flex: 1,
  },
  overviewContent: {
    padding: theme.spacing(2),
    paddingBottom: theme.spacing(4),
  },
  overviewLayout: {
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  overviewLayoutLarge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  overviewMain: { flex: 1 },
  overviewMainLarge: { flex: 3 },
  overviewSide: { flex: 1 },
  overviewSideLarge: { flex: 2 },
  sectionCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(2.5),
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2),
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1.5),
  },
  explanationText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
    lineHeight: 24,
  },
  openMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openMapText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.primary,
  },
  mapWrapper: {
    height: 220,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },

  // ── Empty states ──
  emptyOverview: {
    alignItems: 'center',
    paddingVertical: theme.spacing(4),
    gap: theme.spacing(1.5),
  },
  emptyTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing(8),
    gap: theme.spacing(2),
  },
  emptyTabText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.disabledText,
    textAlign: 'center',
  },
  discussionWrapper: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  messageList: {
    padding: theme.spacing(2),
    paddingBottom: theme.spacing(1),
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageWrapper: {
    marginVertical: 3,
    maxWidth: '78%',
  },
  myMessageWrapper: { alignSelf: 'flex-end' },
  otherMessageWrapper: { alignSelf: 'flex-start' },
  messageBubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  myBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderBottomLeftRadius: 4,
  },
  myMessageText: { color: 'white', fontSize: theme.fontSizes.md },
  otherMessageText: { color: theme.colors.headingText, fontSize: theme.fontSizes.md },
  senderName: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    marginBottom: 4,
  },
  timestamp: { fontSize: 10, marginTop: 4, opacity: 0.7 },
  myTimestamp: { alignSelf: 'flex-end', color: 'rgba(255,255,255,0.8)' },
  otherTimestamp: { alignSelf: 'flex-start', color: theme.colors.bodyText },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: theme.radius.md,
    marginTop: 6,
  },

  // ── Not found ──
  notFoundText: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
  },
  goBackLink: { marginTop: theme.spacing(1) },
  goBackLinkText: {
    color: theme.colors.primary,
    fontSize: theme.fontSizes.md,
  },
});
