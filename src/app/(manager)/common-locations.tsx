import React, { useState, useContext, useMemo, useEffect } from "react";
import { View, StyleSheet, useWindowDimensions, TextInput, TouchableOpacity, Platform, ActivityIndicator, Alert } from "react-native";
import { Text } from "~/components/Themed";
import AnimatedScreen from "~/components/AnimatedScreen";
import SubNavBar from "~/components/SubNavBar";
import { theme } from "~/theme";
import { fetchCommonLocations, deleteCommonLocation } from "~/services/commonLocations";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "~/components/Button";
import { AssignmentsContext } from "~/context/AssignmentsContext";
import { CreateCommonLocationModal } from "~/components/CreateCommonLocationModal";
import { CommonLocation } from "~/types";
import Toast from 'react-native-toast-message';
import { useTranslation } from "react-i18next";

// Deterministic colour from a string — so each location gets a unique stable colour
const BANNER_COLORS = [
  '#1E6B4A', '#2D5F8A', '#7C3F5E', '#4A5C2D', '#6B3A1E',
  '#2D4A7C', '#5E3F7C', '#3A6B4A', '#8A5C2D', '#1E4A6B',
];
function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return BANNER_COLORS[Math.abs(hash) % BANNER_COLORS.length];
}

export default function ManagerCommonLocations() {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const { assignments } = useContext(AssignmentsContext)!;
  
  const [locations, setLocations] = useState<CommonLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [gridWidth, setGridWidth] = useState(0);

  const loadLocations = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCommonLocations();
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading common locations:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load locations.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const numColumns = width < 640 ? 1 : width < 1024 ? 2 : 3;

  const cardWidth = useMemo(() => {
    if (gridWidth <= 0 || Platform.OS === 'web') return undefined;
    const gap = theme.spacing(2);
    return Math.max(0, (gridWidth - gap * (numColumns - 1)) / numColumns);
  }, [gridWidth, numColumns]);

  const gridStyle = useMemo(() =>
    Platform.OS === 'web'
      ? {
          display: 'grid' as any,
          gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))`,
          gap: theme.spacing(2),
        }
      : null,
    [numColumns]
  );

  const getWorkerCountForLocation = (locationId: string) => {
    const workerIds = new Set<string>();
    assignments.forEach(a => {
      if (a.ref_id === locationId && a.ref_type === 'common_location') workerIds.add(a.worker_id);
    });
    return workerIds.size;
  };

  const filteredLocations = useMemo(() =>
    locations.filter(loc =>
      loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loc.address && loc.address.toLowerCase().includes(searchTerm.toLowerCase()))
    ),
    [locations, searchTerm]
  );

  const handleDeleteLocation = (id: string, name: string) => {
    Alert.alert(
      t('manager.locations.deleteTitle'),
      t('manager.locations.deleteConfirm', { name }),
      [
        { text: t('manager.locations.delete'), style: 'destructive', onPress: async () => {
          try {
            await deleteCommonLocation(id);
            Toast.show({ type: 'success', text1: 'Success', text2: 'Location deleted.' });
            loadLocations();
          } catch {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to delete location.' });
          }
        }},
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const LocationCardItem = ({ item }: { item: CommonLocation }) => {
    const workerCount = getWorkerCountForLocation(item.id);
    const bannerColor = colorFromName(item.name);
    const initials = item.name.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join('');
    const cardWidthStyle = cardWidth ? { width: cardWidth } : { width: '100%' as const };

    return (
      <View style={[styles.cardOuter, cardWidthStyle]}>
        <View style={styles.cardTouchable}>
          {/* Banner with initials */}
          <View style={[styles.cardBanner, { backgroundColor: bannerColor }]}>
            <Text style={styles.bannerInitials} fontType="bold">{initials}</Text>
            {/* Delete button top-right */}
            <TouchableOpacity
              onPress={() => handleDeleteLocation(item.id, item.name)}
              style={styles.deleteBannerButton}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="trash-outline" size={14} color="white" />
            </TouchableOpacity>
          </View>

          {/* Card body */}
          <View style={styles.cardBody}>
            <Text style={styles.locationName} fontType="bold" numberOfLines={1}>{item.name}</Text>

            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={theme.colors.bodyText} />
              <Text style={styles.metaText} fontType="regular" numberOfLines={1}>
                {item.address || t('manager.locations.noAddress')}
              </Text>
            </View>

            {(item.latitude && item.longitude) ? (
              <View style={styles.metaItem}>
                <Ionicons name="navigate-outline" size={13} color={theme.colors.bodyText} />
                <Text style={styles.metaText} fontType="regular">
                  {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                </Text>
              </View>
            ) : null}

            <View style={styles.cardFooter}>
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={13} color={theme.colors.bodyText} />
                <Text style={styles.metaText} fontType="regular">
                  {workerCount} {workerCount === 1 ? t('manager.locations.workerToday') : t('manager.locations.workersToday')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <SubNavBar items={[
        { label: t('manager.navigation.projects'), href: '/(manager)/projects' },
        { label: t('manager.navigation.commonLocations'), href: '/(manager)/common-locations' },
        { label: t('manager.navigation.liveMap'), href: '/(manager)/map-overview' },
        { label: t('manager.navigation.locationReplay'), href: '/(manager)/location-replay' },
      ]} />
      <AnimatedScreen>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle} fontType="bold">{t('manager.locations.title')}</Text>
          <Text style={styles.pageSubtitle} fontType="regular">{t('manager.locations.subtitle')}</Text>
        </View>

        <View style={styles.mainContentCard}>
          <View style={styles.headerControls}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('manager.locations.searchPlaceholder') as string}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor={theme.colors.bodyText}
            />
            <Button
              title={t('manager.locations.addLocation') as string}
              onPress={() => setModalVisible(true)}
              style={styles.addButton}
              textStyle={styles.addButtonText}
              icon={<Ionicons name="add" size={20} color="white" />}
            />
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: theme.spacing(4) }} />
          ) : filteredLocations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="map-outline" size={48} color={theme.colors.borderColor} />
              <Text style={styles.emptyText} fontType="regular">{t('manager.locations.noLocations')}</Text>
            </View>
          ) : (
            <View
              style={[styles.grid, gridStyle as any]}
              onLayout={e => setGridWidth(e.nativeEvent.layout.width)}
            >
              {filteredLocations.map(item => (
                <LocationCardItem key={item.id} item={item} />
              ))}
            </View>
          )}
        </View>

        <CreateCommonLocationModal
          visible={isModalVisible}
          onClose={() => setModalVisible(false)}
          onCreated={loadLocations}
        />
      </AnimatedScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    paddingVertical: theme.spacing(4),
    paddingHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.background,
    alignItems: 'flex-start',
  },
  pageTitle: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  pageSubtitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.bodyText,
  },
  mainContentCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(3),
    marginHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(2),
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
    }),
  },
  headerControls: {
    marginBottom: theme.spacing(3),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
  },
  searchInput: {
    flex: 1,
    minWidth: 220,
    height: 40,
    backgroundColor: theme.colors.pageBackground,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  addButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  addButtonText: {
    color: 'white',
    fontSize: theme.fontSizes.md,
    marginLeft: 4,
  },
  grid: {
    width: '100%',
    ...Platform.select({
      native: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing(2),
        alignContent: 'flex-start',
      },
    }),
  },
  // --- Card ---
  cardOuter: {
    ...Platform.select({ native: { marginBottom: theme.spacing(2) } }),
  },
  cardTouchable: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    backgroundColor: theme.colors.cardBackground,
    overflow: 'hidden',
    ...Platform.select({
      native: { ...theme.shadow.soft },
    }),
  },
  cardBanner: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bannerInitials: {
    fontSize: 30,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 3,
  },
  deleteBannerButton: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: theme.spacing(1.5),
    gap: theme.spacing(0.75),
  },
  locationName: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
    marginBottom: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
    flex: 1,
  },
  cardFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.borderColor,
    paddingTop: theme.spacing(0.75),
    marginTop: theme.spacing(0.5),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing(8),
    gap: theme.spacing(2),
  },
  emptyText: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.disabledText,
  },
});
