import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { StyleSheet, Alert, ScrollView, ActivityIndicator, Linking, TouchableOpacity, RefreshControl, Platform, Image } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as BackgroundLocation from 'background-location';
import { getDistance } from "geolib";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { CircularTimer } from "../../components/CircularTimer";
import AnimatedScreen from "../../components/AnimatedScreen";
import { theme } from "../../theme";
import { MapView, Marker, Circle } from '../../components/MapView';
import { useSession } from '~/context/AuthContext';
import { useAssignments } from '~/context/AssignmentsContext';
import { useProjects } from '~/context/ProjectsContext';
import { ProcessedAssignmentStepWithStatus, AssignmentStatus } from '~/types';
import moment from 'moment';
import Toast from 'react-native-toast-message';
import AssignmentSelectionModal from '../../components/AssignmentSelectionModal';
import { View, Text } from '../../components/Themed';

import { GeofenceAssignment } from 'background-location';

export default function Home() {
  const { user, userCompanyId, isCompanyIdLoading, deviceToken, deviceSecret, userCompanyName } = useSession();
  const { loadInitialProjects, isLoading: projectsLoading } = useProjects();
  const [currentDate, setCurrentDate] = useState(moment().format('YYYY-MM-DD'));
  const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | null>(null);
  const [workerMapLocation, setWorkerMapLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const mapRef = useRef<any>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const notificationSentRef = useRef(false);
  const [isAssignmentSelectionModalVisible, setIsAssignmentSelectionModalVisible] = useState(false);
  const [selectedNextAssignmentId, setSelectedNextAssignmentId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessingCheckInOut, setIsProcessingCheckInOut] = useState(false);
  const [pendingAction, setPendingAction] = useState<'checking_in' | 'checking_out' | null>(null);

  const { processedAssignments, loadAssignmentsForDate, loadWorkSessionsForDate, isLoading: assignmentsLoading, activeWorkSession, startWorkSession, endWorkSession, lastCheckoutAssignmentId } = useAssignments();

  const isDataLoading = assignmentsLoading || projectsLoading;
  const ACCEPTABLE_DISTANCE = 150; // meters

  const checkedIn = !!activeWorkSession;
  const sessionStartTime = activeWorkSession ? new Date(activeWorkSession.start_time).getTime() : null;
  const stableCheckedIn = pendingAction === 'checking_in' ? true : (pendingAction === 'checking_out' ? false : checkedIn);

  const fetchHomeData = useCallback(async (forceFetchFromSupabase = false) => {
    if (user?.id) {
      if (activeWorkSession && activeWorkSession.worker_assignments) {
        const dateToLoad = activeWorkSession.worker_assignments.assigned_date;
        await loadAssignmentsForDate(dateToLoad, [user.id], forceFetchFromSupabase);
        await loadWorkSessionsForDate(dateToLoad, user.id);
      } else if (activeWorkSession === null) {
        await loadAssignmentsForDate(currentDate, [user.id], forceFetchFromSupabase);
        await loadWorkSessionsForDate(currentDate, user.id);
      }
    }
  }, [user?.id, activeWorkSession, loadAssignmentsForDate, loadWorkSessionsForDate, currentDate]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadInitialProjects(),
      fetchHomeData(true)
    ]);
    setIsRefreshing(false);
  }, [fetchHomeData, loadInitialProjects]);

  const requestPermissionAgain = async () => {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(foregroundStatus);
    if (foregroundStatus === 'granted') {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') Linking.openSettings();
    } else {
      Linking.openSettings();
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const today = moment().format('YYYY-MM-DD');
      if (today !== currentDate) setCurrentDate(today);
    }, 60000);
    return () => clearInterval(interval);
  }, [currentDate]);

  useEffect(() => {
    (async () => {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(foregroundStatus);
      if (foregroundStatus === 'granted') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          Alert.alert("Background Location Required", "This app requires background location access to track work hours accurately.", [{ text: "Open Settings", onPress: () => Linking.openSettings() }]);
        }
        await Notifications.requestPermissionsAsync();
      }
    })();
  }, []);

  const currentWorkersAssignments = useMemo(() => {
    return user?.id ? processedAssignments[user.id] || [] : [];
  }, [user?.id, processedAssignments]);

  const assignmentAtCurrentLocation = useMemo(() => {
    if (!workerMapLocation || currentWorkersAssignments.length === 0) return null;
    return currentWorkersAssignments.find(assign => {
      const loc = (assign as any).project?.location || (assign as any).location;
      if (!loc) return false;
      const d = getDistance(
        { latitude: workerMapLocation.latitude, longitude: workerMapLocation.longitude },
        { latitude: loc.latitude, longitude: loc.longitude }
      );
      return d < ACCEPTABLE_DISTANCE;
    }) || null;
  }, [workerMapLocation, currentWorkersAssignments]);

  const { currentActiveAssignment, nextAssignableAssignment } = useMemo(() => {
    if (!user?.id || currentWorkersAssignments.length === 0) return { currentActiveAssignment: null, nextAssignableAssignment: null };
    const currentActive = currentWorkersAssignments.find((assign: ProcessedAssignmentStepWithStatus) => assign.status === 'active') || null;
    const nextAssignable = currentWorkersAssignments.find((assign: ProcessedAssignmentStepWithStatus) => assign.status === 'next') || null;
    return { currentActiveAssignment: currentActive, nextAssignableAssignment: nextAssignable };
  }, [user?.id, currentWorkersAssignments]);

  const { relevantAssignment, isSelectionLocked } = useMemo(() => {
    if (checkedIn) {
      return { 
        relevantAssignment: assignmentAtCurrentLocation || currentActiveAssignment, 
        isSelectionLocked: true 
      };
    }
    
    if (assignmentAtCurrentLocation) {
      return { relevantAssignment: assignmentAtCurrentLocation, isSelectionLocked: false };
    }

    const lastCheckoutAss = currentWorkersAssignments.find((assign: ProcessedAssignmentStepWithStatus) => assign.id === lastCheckoutAssignmentId);
    let assignmentToDisplay = selectedNextAssignmentId 
      ? currentWorkersAssignments.find(a => a.id === selectedNextAssignmentId) || null
      : lastCheckoutAss || nextAssignableAssignment;

    return { relevantAssignment: assignmentToDisplay, isSelectionLocked: false };
  }, [checkedIn, currentActiveAssignment, assignmentAtCurrentLocation, currentWorkersAssignments, lastCheckoutAssignmentId, selectedNextAssignmentId, nextAssignableAssignment]);

  const targetProjectLocation = useMemo(() => {
    const ass = relevantAssignment as any;
    if (ass?.type === 'project' && ass.project) {
      return { lat: ass.project.location.latitude, lon: ass.project.location.longitude };
    }
    if (ass?.type === 'common_location' && ass.location) {
      return { lat: ass.location.latitude ?? 0, lon: ass.location.longitude ?? 0 };
    }
    return null;
  }, [relevantAssignment]);

  const projectLocationName = useMemo(() => {
    const ass = relevantAssignment as any;
    if (ass?.type === 'project' && ass.project) return ass.project.name;
    if (ass?.type === 'common_location' && ass.location) return ass.location.name;
    return "Project Site";
  }, [relevantAssignment]);

  const isNearby = distance !== null && distance < ACCEPTABLE_DISTANCE;

  const statusBadgeInfo = useMemo(() => {
    if (stableCheckedIn) {
      if (isNearby) return { label: "WORKING", type: 'active' };
      return { label: "OFF-SITE", type: 'warning' };
    }
    if (relevantAssignment) {
      if (isNearby) return { label: "READY", type: 'success' };
      return { label: "AWAY", type: 'warning' };
    }
    return null;
  }, [stableCheckedIn, isNearby, relevantAssignment]);

  const locationStatusText = useMemo(() => {
    if (!relevantAssignment) return "No scheduled assignments today.";
    if (!locationReady) return "Locating you...";
    if (!targetProjectLocation) return "No location coordinates for this site.";
    if (isNearby) return `At ${projectLocationName}`;
    
    const displayDistance = distance ?? 0;
    const formattedDistance = displayDistance > 1000 ? `${(displayDistance / 1000).toFixed(1)}km` : `${Math.round(displayDistance)}m`;
    return `${formattedDistance} from ${projectLocationName}`;
  }, [relevantAssignment, locationReady, targetProjectLocation, isNearby, distance, projectLocationName]);

  useEffect(() => { fetchHomeData(); }, [fetchHomeData]);

  useEffect(() => {
    let timer: any;
    if (checkedIn && sessionStartTime) {
      timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [checkedIn, sessionStartTime]);

  useEffect(() => {
    let intervalId: any;
    let isMounted = true;

    const fetchAndSetLocation = async () => {
      if (!isMounted) return;
      try {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = location.coords;
        if (isMounted) {
          setWorkerMapLocation({ latitude, longitude });
          if (!locationReady) setLocationReady(true);
          if (targetProjectLocation) {
            setDistance(getDistance({ latitude, longitude }, { latitude: targetProjectLocation.lat, longitude: targetProjectLocation.lon }));
          } else {
            setDistance(null);
          }
        }
      } catch (error) {
        if (isMounted) {
          setLocationReady(false);
          setDistance(null);
        }
      }
    };

    if (locationPermission === 'granted') {
      fetchAndSetLocation();
      intervalId = setInterval(fetchAndSetLocation, 10000);
    }
    return () => { isMounted = false; if (intervalId) clearInterval(intervalId); };
  }, [locationPermission, targetProjectLocation]);

  const handleCheckIn = async () => {
    if (checkedIn || !relevantAssignment || !targetProjectLocation) return;
    const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') { Alert.alert("Background Location Required", "Please allow location access 'All the time'."); return; }

    let currentLocation;
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      currentLocation = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    } catch (err) { return; }

    const d = getDistance(currentLocation, { latitude: targetProjectLocation.lat, longitude: targetProjectLocation.lon });
    if (d > ACCEPTABLE_DISTANCE) { Alert.alert("Too far", `You must be at ${projectLocationName} to check in.`); return; }

    setIsProcessingCheckInOut(true);
    setPendingAction('checking_in');
    
    try {
      await startWorkSession(relevantAssignment.id, currentLocation);
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      const currentGeofenceAssignments: GeofenceAssignment[] = [{
        id: relevantAssignment.id,
        latitude: targetProjectLocation.lat,
        longitude: targetProjectLocation.lon,
        radius: ACCEPTABLE_DISTANCE,
        type: (relevantAssignment as any).type,
        status: 'active',
      }];

      BackgroundLocation.start(user!.id, relevantAssignment.id, userCompanyId!, JSON.stringify({ url: supabaseUrl, key: supabaseKey }), deviceToken!, deviceSecret!, JSON.stringify(currentGeofenceAssignments));
      Toast.show({ type: 'success', text1: 'Checked In', text2: `Working on ${projectLocationName}` });
      setSelectedNextAssignmentId(null);
    } catch (err: any) {
      Alert.alert("Check-in Failed", err.message);
    } finally {
      setIsProcessingCheckInOut(false);
      setPendingAction(null);
    }
  };

  const handleCheckOut = async () => {
    if (!activeWorkSession) return;
    let currentLocation;
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      currentLocation = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    } catch (err) { return; }

    setIsProcessingCheckInOut(true);
    setPendingAction('checking_out');
    
    try {
      await endWorkSession(activeWorkSession.id, currentLocation);
      BackgroundLocation.stop();
      Toast.show({ type: 'info', text1: 'Checked Out', text2: `Success from ${projectLocationName}` });
      setElapsedTime(0);
      setSelectedNextAssignmentId(null);
    } catch (err: any) {
      Alert.alert("Check-out Failed", err.message);
    } finally {
      setIsProcessingCheckInOut(false);
      setPendingAction(null);
    }
  };

  const isActuallyProcessing = isProcessingCheckInOut || pendingAction !== null;
  const buttonDisabled = isDataLoading || (stableCheckedIn ? false : (!isNearby || !relevantAssignment || !targetProjectLocation));
  const buttonTitle = stableCheckedIn ? "Check Out" : (relevantAssignment ? "Check In" : "No Next Assignment");

  useEffect(() => {
    if (workerMapLocation && targetProjectLocation) {
      const latDelta = Math.abs(workerMapLocation.latitude - targetProjectLocation.lat) * 1.5;
      const lonDelta = Math.abs(workerMapLocation.longitude - targetProjectLocation.lon) * 1.5;
      setMapRegion({
        latitude: (workerMapLocation.latitude + targetProjectLocation.lat) / 2,
        longitude: (workerMapLocation.longitude + targetProjectLocation.lon) / 2,
        latitudeDelta: Math.max(latDelta, 0.005),
        longitudeDelta: Math.max(lonDelta, 0.005),
      });
    } else if (workerMapLocation) {
      setMapRegion({ latitude: workerMapLocation.latitude, longitude: workerMapLocation.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 });
    } else if (targetProjectLocation) {
      setMapRegion({ latitude: targetProjectLocation.lat, longitude: targetProjectLocation.lon, latitudeDelta: 0.005, longitudeDelta: 0.005 });
    }
  }, [workerMapLocation, targetProjectLocation]);

  const handleSelectAssignment = (assignmentId: string) => {
    setSelectedNextAssignmentId(assignmentId);
    setIsAssignmentSelectionModalVisible(false);
  };

  if (locationPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  if (locationPermission !== 'granted') {
    return (
      <View style={styles.centered}>
        <Ionicons name="location-outline" size={64} color={theme.colors.primary} />
        <Text style={styles.pageTitle} fontType="bold">Location Access Required</Text>
        <Text style={styles.pageSubtitle}>This app needs your location to track work hours.</Text>
        <Button title="Grant Permission" onPress={requestPermissionAgain} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <AnimatedScreen>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        <View style={styles.pageHeader}>
          <Image 
            source={require('../../../assets/koordlogoblack1.png')} 
            style={styles.logo} 
            resizeMode="contain" 
          />
        </View>
        <View style={styles.homeContent}>
          {/* 1. Combined Assignment & Status Card */}
          <Card style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionTitle} fontType="bold">
                {stableCheckedIn ? "Current Assignment" : "Today's Schedule"}
              </Text>
              {statusBadgeInfo && (
                <View style={[styles.statusBadge, { 
                  backgroundColor: statusBadgeInfo.type === 'active' ? theme.statusColors.activeBackground : 
                                   statusBadgeInfo.type === 'success' ? theme.statusColors.successBackground : 
                                   theme.statusColors.warningBackground
                }]}>
                  <Text style={[styles.statusBadgeText, { 
                    color: statusBadgeInfo.type === 'active' ? theme.statusColors.activeText : 
                           statusBadgeInfo.type === 'success' ? theme.statusColors.successText : 
                           theme.statusColors.warningText
                  }]} fontType="bold">
                    {statusBadgeInfo.label}
                  </Text>
                </View>
              )}
            </View>
            
            {isDataLoading ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 10 }} />
            ) : !relevantAssignment ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={32} color={theme.colors.disabledText} />
                <Text style={styles.emptyText}>No assignments scheduled for today.</Text>
              </View>
            ) : (
              <View>
                <TouchableOpacity 
                  style={styles.assignmentItem} 
                  onPress={() => setIsAssignmentSelectionModalVisible(true)}
                  disabled={isSelectionLocked}
                >
                  <View style={[styles.projectIconContainer, { backgroundColor: (relevantAssignment as any).project?.color || theme.colors.primary + '20' }]}>
                    <Ionicons name="business-outline" size={20} color="white" />
                  </View>
                  <View style={styles.projectInfo}>
                    <Text style={styles.projectName} fontType="bold">{projectLocationName}</Text>
                    <Text style={styles.projectAddress} numberOfLines={1}>{(relevantAssignment as any).project?.address || 'Site assignment'}</Text>
                  </View>
                  {!isSelectionLocked && <Ionicons name="chevron-forward" size={20} color={theme.colors.disabledText} />}
                </TouchableOpacity>

                <View style={styles.statusDetailRow}>
                  <Ionicons 
                    name={stableCheckedIn ? "time-outline" : "location-outline"} 
                    size={16} 
                    color={theme.colors.bodyText} 
                  />
                  <Text style={styles.statusSubText} fontType="medium">
                    {stableCheckedIn && sessionStartTime 
                      ? ` Started at ${moment(sessionStartTime).format('hh:mm A')}` 
                      : ` ${locationStatusText}`}
                  </Text>
                </View>
              </View>
            )}
          </Card>

          {/* 2. Focus Section: Timer or Map */}
          {(stableCheckedIn || relevantAssignment) && (
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle} fontType="bold">
                {stableCheckedIn ? "Active Session" : "Location Overview"}
              </Text>
              <View style={styles.focusContainer}>
                {stableCheckedIn ? (
                  <CircularTimer elapsedTime={elapsedTime} size={240} strokeWidth={12} />
                ) : (
                  <View style={styles.mapWrapper}>
                    {locationReady && workerMapLocation && targetProjectLocation ? (
                      <MapView
                        ref={mapRef}
                        style={styles.map}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        showsUserLocation={true}
                        region={mapRegion}
                      >
                        <Marker 
                          coordinate={{ latitude: targetProjectLocation.lat, longitude: targetProjectLocation.lon }}
                          anchor={{ x: 0.5, y: 0.5 }}
                        >
                          <View style={styles.markerContainer}>
                            <Ionicons name="briefcase" size={16} color="white" />
                          </View>
                        </Marker>
                        <Circle center={{ latitude: targetProjectLocation.lat, longitude: targetProjectLocation.lon }} radius={ACCEPTABLE_DISTANCE} strokeWidth={2} strokeColor={theme.colors.primary} fillColor={theme.colors.primary + '20'} />
                      </MapView>
                    ) : (
                      <View style={styles.mapLoading}>
                        <ActivityIndicator color={theme.colors.primary} />
                        <Text style={styles.mapLoadingText}>Preparing map...</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </Card>
          )}
        </View>
      </ScrollView>

      {/* FIXED FOOTER BUTTON */}
      <View style={styles.footer}>
        <Button
          onPress={stableCheckedIn ? handleCheckOut : handleCheckIn}
          style={[styles.actionButton, stableCheckedIn ? styles.checkOutBtn : styles.checkInBtn]}
          disabled={buttonDisabled || isActuallyProcessing}
          title={buttonTitle}
          textStyle={styles.buttonText}
          loading={isActuallyProcessing}
        />
      </View>

      <AssignmentSelectionModal
        isVisible={isAssignmentSelectionModalVisible}
        onClose={() => setIsAssignmentSelectionModalVisible(false)}
        assignments={currentWorkersAssignments}
        onSelectAssignment={handleSelectAssignment}
        currentSelectedId={selectedNextAssignmentId || relevantAssignment?.id || null}
      />
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.bodyText,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  pageHeader: {
    paddingVertical: theme.spacing(4),
    paddingHorizontal: theme.spacing(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 36,
  },
  pageTitle: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
  },
  pageSubtitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
  homeContent: {
    paddingHorizontal: theme.spacing(3),
  },
  sectionCard: {
    marginBottom: theme.spacing(2),
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2),
  },
  statusBadge: {
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(0.5),
    borderRadius: theme.radius.pill,
  },
  statusBadgeText: {
    fontSize: theme.fontSizes.xs,
  },
  statusInfo: {
    marginTop: 5,
  },
  statusMainText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  statusSubText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.disabledText,
    marginTop: 4,
  },
  todayText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.disabledText,
  },
  assignmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing(1),
  },
  projectIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing(2),
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  projectAddress: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
  statusDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing(1.5),
    paddingTop: theme.spacing(1.5),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: theme.colors.disabledText,
    marginTop: 10,
    fontSize: theme.fontSizes.sm,
  },
  focusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  mapWrapper: {
    width: '100%',
    height: 240,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    backgroundColor: theme.colors.primary,
    padding: 6,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'white',
  },
  mapLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  mapLoadingText: {
    marginTop: 10,
    color: theme.colors.disabledText,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing(3),
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  actionButton: {
    height: 56,
    borderRadius: theme.radius.lg,
    width: '100%',
  },
  checkInBtn: {
    backgroundColor: theme.colors.primary,
  },
  checkOutBtn: {
    backgroundColor: theme.colors.secondary,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
});
