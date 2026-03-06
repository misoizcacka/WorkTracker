import React, { useState, useContext, useMemo, useEffect } from "react";
import { View, StyleSheet, useWindowDimensions, TextInput, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { Text } from "~/components/Themed";
import { Card } from "~/components/Card";
import AnimatedScreen from "~/components/AnimatedScreen";
import { theme } from "~/theme";
import { fetchCommonLocations, deleteCommonLocation } from "~/services/commonLocations";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "~/components/Button";
import { AssignmentsContext } from "~/context/AssignmentsContext";
import { CreateCommonLocationModal } from "~/components/CreateCommonLocationModal";
import { CommonLocation } from "~/types";
import Toast from 'react-native-toast-message';

export default function ManagerCommonLocations() {
  const { width } = useWindowDimensions();
  const { assignments } = useContext(AssignmentsContext)!;
  
  const [locations, setLocations] = useState<CommonLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);

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

  const getNumColumns = () => {
    if (width < 640) return 1; // Mobile
    if (width < 1024) return 2; // Tablet
    return 3; // Desktop
  };

  const numColumns = getNumColumns();
  const cardWidth = useMemo(() => {
    const totalHorizontalPadding = theme.spacing(1) * 2;
    const gutter = theme.spacing(2);
    const containerPadding = theme.spacing(3) * 2;

    const availableWidth = width - containerPadding;
    const itemWidth = (availableWidth - (gutter * (numColumns - 1))) / numColumns;
    
    return itemWidth;
  }, [width, numColumns]);

  const getWorkerCountForLocation = (locationId: string) => {
    const workerIds = new Set();
    assignments.forEach(assignment => {
      if (assignment.ref_id === locationId && assignment.ref_type === 'common_location') {
        workerIds.add(assignment.worker_id);
      }
    });
    return workerIds.size;
  };

  const filteredLocations = useMemo(() => {
    return locations.filter(loc =>
      loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loc.address && loc.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [locations, searchTerm]);

  const handleDeleteLocation = async (id: string) => {
    try {
      await deleteCommonLocation(id);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Location deleted.' });
      loadLocations();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to delete location.' });
    }
  };

  const LocationCardItem = ({ item }: { item: CommonLocation }) => {
    const workerCount = getWorkerCountForLocation(item.id);

    return (
      <View style={[styles.cardContainer, { width: cardWidth }]}>
        <Card style={styles.locationCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="location-outline" size={24} color={theme.colors.primary} />
            </View>
            <TouchableOpacity onPress={() => handleDeleteLocation(item.id)} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.cardBody}>
            <Text style={styles.locationName} fontType="bold" numberOfLines={1}>{item.name}</Text>
            <Text style={styles.locationAddress} fontType="regular" numberOfLines={2}>
              {item.address || 'No address provided'}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.footerStat}>
              <Ionicons name="people-outline" size={16} color={theme.colors.bodyText} />     
              <Text style={styles.footerStatText} fontType="medium">
                {workerCount} {workerCount === 1 ? 'worker' : 'workers'} today
              </Text>
            </View>
          </View>
        </Card>
      </View>
    );
  };

  return (
    <AnimatedScreen>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle} fontType="bold">Common Locations</Text>
        <Text style={styles.pageSubtitle} fontType="regular">Manage reusable locations like warehouses or office branches.</Text>
      </View>

      <View style={styles.mainContentCard}>
        <View style={styles.headerControls}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search locations..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor={theme.colors.bodyText}
          />
          <Button 
            title="Add Location" 
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
            <Ionicons name="map-outline" size={64} color={theme.colors.borderColor} />
            <Text style={styles.emptyText} fontType="regular">No locations found.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredLocations.map((item) => (
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
    minWidth: 250,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing(1),
  },
  cardContainer: {
    paddingHorizontal: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  locationCard: {
    padding: theme.spacing(2),
    minHeight: 180,
    justifyContent: 'space-between',
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing(1.5),
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.pageBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    padding: theme.spacing(1),
  },
  cardBody: {
    flex: 1,
    marginBottom: theme.spacing(2),
  },
  locationName: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  locationAddress: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
    lineHeight: 18,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
    paddingTop: theme.spacing(1.5),
  },
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerStatText: {
    marginLeft: theme.spacing(1),
    color: theme.colors.bodyText,
    fontSize: theme.fontSizes.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing(10),
  },
  emptyText: {
    marginTop: theme.spacing(2),
    fontSize: theme.fontSizes.lg,
    color: theme.colors.disabledText,
  },
});
