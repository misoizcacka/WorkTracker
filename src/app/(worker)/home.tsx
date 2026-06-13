import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { StyleSheet, Alert, ScrollView, ActivityIndicator, Linking, TouchableOpacity, RefreshControl, Platform, Image } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as BackgroundLocation from 'background-location';
import { getDistance } from "geolib";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
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
import { Logo } from '~/components/Logo';

import { GeofenceAssignment } from 'background-location';
import { fetchAssignmentsForWorkers } from '~/services/workerAssignments';

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
  const [lastOnSiteAssignmentId, setLastOnSiteAssignmentId] = useState<string | null>(null);

  const { processedAssignments, loadAssignmentsForDate, loadWorkSessionsForDate, isLoading: assignmentsLoading, activeWorkSession, loadedWorkSessions, startWorkSession, endWorkSession, lastCheckoutAssignmentId, isOffline } = useAssignments();

  const isDataLoading = assignmentsLoading || projectsLoading;
  const ACCEPTABLE_DISTANCE = 150; // meters

  const checkedIn = !!activeWorkSession;
  const sessionStartTime = activeWorkSession ? new Date(activeWorkSession.start_time).getTime() : null;
  const stableCheckedIn = pendingAction === 'checking_in' ? true : (pendingAction === 'checking_out' ? false : checkedIn);

  const fetchHomeData = useCallback(async (forceFetchFromSupabase = false, targetDate?: string) => {
    const dateToUse = targetDate ?? currentDate;
    if (user?.id) {
      if (activeWorkSession && activeWorkSession.worker_assignments) {
        const dateToLoad = activeWorkSession.worker_assignments.assigned_date;
        await loadAssignmentsForDate(dateToLoad, [user.id], forceFetchFromSupabase);
        await loadWorkSessionsForDate(dateToLoad, user.id);
      } else if (activeWorkSession === null) {
        await loadAssignmentsForDate(dateToUse, [user.id], forceFetchFromSupabase);
        await loadWorkSessionsForDate(dateToUse, user.id);
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

  const visibleAssignmentDate = useMemo(() => {
    if (activeWorkSession?.worker_assignments?.assigned_date) {
      return activeWorkSession.worker_assignments.assigned_date;
    }
    return currentDate;
  }, [activeWorkSession?.worker_assignments?.assigned_date, currentDate]);

  const currentWorkersAssignments = useMemo(() => {
    const workerAssignments = user?.id ? processedAssignments[user.id] || [] : [];
    return workerAssignments.filter((assignment) => (assignment as any).assigned_date === visibleAssignmentDate);
  }, [user?.id, processedAssignments, visibleAssignmentDate]);

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
    if (!user?.id || currentWorkersAssignments.length === 0) {
      return { currentActiveAssignment: null, nextAssignableAssignment: null };
    }

    const sortedAssignments = [...currentWorkersAssignments].sort((a, b) => a.sort_key.localeCompare(b.sort_key));
    const currentActive = activeWorkSession
      ? sortedAssignments.find((assignment) => assignment.id === activeWorkSession.assignment_id) || null
      : null;

    const completedAssignmentsForVisibleDate = loadedWorkSessions
      .filter((session) => !!session.end_time && moment(session.start_time).format('YYYY-MM-DD') === visibleAssignmentDate)
      .map((session) => session.assignment_id);

    const lastCompletedSortKeyForVisibleDate = sortedAssignments
      .filter((assignment) => completedAssignmentsForVisibleDate.includes(assignment.id))
      .sort((a, b) => b.sort_key.localeCompare(a.sort_key))[0]?.sort_key ?? null;

    const nextAssignable = lastCompletedSortKeyForVisibleDate
      ? sortedAssignments.find((assignment) => assignment.sort_key > lastCompletedSortKeyForVisibleDate) || null
      : sortedAssignments[0] || null;

    return { currentActiveAssignment: currentActive, nextAssignableAssignment: nextAssignable };
  }, [activeWorkSession, currentWorkersAssignments, loadedWorkSessions, user?.id, visibleAssignmentDate]);

  const lastWorkedAssignment = useMemo(() => {
    if (currentWorkersAssignments.length === 0) {
      return null;
    }

    const sessionsForVisibleDate = loadedWorkSessions
      .filter((session) => moment(session.start_time).format('YYYY-MM-DD') === visibleAssignmentDate)
      .sort((a, b) => {
        const aTime = new Date(a.end_time ?? a.start_time).getTime();
        const bTime = new Date(b.end_time ?? b.start_time).getTime();
        return bTime - aTime;
      });

    const latestWorkedSession = sessionsForVisibleDate[0];
    if (!latestWorkedSession?.assignment_id) {
      return currentActiveAssignment;
    }

    return currentWorkersAssignments.find((assignment) => assignment.id === latestWorkedSession.assignment_id) || currentActiveAssignment;
  }, [currentWorkersAssignments, currentActiveAssignment, loadedWorkSessions, visibleAssignmentDate]);

  const lastOnSiteAssignment = useMemo(() => {
    if (!lastOnSiteAssignmentId) {
      return null;
    }
    return currentWorkersAssignments.find((assignment) => assignment.id === lastOnSiteAssignmentId) || null;
  }, [currentWorkersAssignments, lastOnSiteAssignmentId]);

  useEffect(() => {
    if (assignmentAtCurrentLocation?.id) {
      setLastOnSiteAssignmentId(assignmentAtCurrentLocation.id);
      return;
    }

    if (!checkedIn) {
      setLastOnSiteAssignmentId(null);
    }
  }, [assignmentAtCurrentLocation, checkedIn]);

  const { relevantAssignment, isSelectionLocked } = useMemo(() => {
    if (checkedIn) {
      return { 
        relevantAssignment: assignmentAtCurrentLocation || lastOnSiteAssignment || lastWorkedAssignment || currentActiveAssignment, 
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
  }, [checkedIn, currentActiveAssignment, assignmentAtCurrentLocation, currentWorkersAssignments, lastCheckoutAssignmentId, lastOnSiteAssignment, lastWorkedAssignment, selectedNextAssignmentId, nextAssignableAssignment]);

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

  const backgroundGeofenceAssignments = useMemo<GeofenceAssignment[]>(() => {
    const geofences = currentWorkersAssignments.flatMap((assignment) => {
      const ass = assignment as any;
      const latitude = ass.type === 'project'
        ? ass.project?.location?.latitude
        : ass.location?.latitude;
      const longitude = ass.type === 'project'
        ? ass.project?.location?.longitude
        : ass.location?.longitude;

      if (latitude == null || longitude == null) {
        return [];
      }

      return [{
        id: assignment.id,
        latitude,
        longitude,
        radius: ACCEPTABLE_DISTANCE,
        type: ass.type,
        status: assignment.id === activeWorkSession?.assignment_id ? 'active' : assignment.status,
      }];
    });

    if (relevantAssignment && !geofences.some((assignment) => assignment.id === relevantAssignment.id) && targetProjectLocation) {
      geofences.unshift({
        id: relevantAssignment.id,
        latitude: targetProjectLocation.lat,
        longitude: targetProjectLocation.lon,
        radius: ACCEPTABLE_DISTANCE,
        type: (relevantAssignment as any).type,
        status: relevantAssignment.id === activeWorkSession?.assignment_id ? 'active' : relevantAssignment.status,
      });
    }

    return geofences;
  }, [ACCEPTABLE_DISTANCE, activeWorkSession?.assignment_id, currentWorkersAssignments, relevantAssignment, targetProjectLocation]);

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

  useEffect(() => {
    if (!checkedIn || !activeWorkSession || !user?.id || !userCompanyId || !deviceToken || !deviceSecret) {
      return;
    }

    if (backgroundGeofenceAssignments.length === 0) {
      return;
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return;
    }

    BackgroundLocation.start(
      user.id,
      activeWorkSession.assignment_id,
      userCompanyId,
      JSON.stringify({ url: supabaseUrl, key: supabaseKey }),
      deviceToken,
      deviceSecret,
      JSON.stringify(backgroundGeofenceAssignments),
      projectLocationName
    ).catch((error) => {
      console.error('Failed to refresh background geofence assignments:', error);
    });
  }, [activeWorkSession, backgroundGeofenceAssignments, checkedIn, deviceSecret, deviceToken, user?.id, userCompanyId]);

  const handleCheckIn = async () => {
    if (checkedIn || !relevantAssignment || !targetProjectLocation) return;

    const today = moment().format('YYYY-MM-DD');
    if (currentDate !== today) {
      if (isOffline) {
        Alert.alert("Connect to Refresh", "Today's assignments have not been loaded yet. Go online to refresh your schedule before checking in.");
        return;
      }

      setCurrentDate(today);
      await fetchHomeData(true, today);
      Alert.alert("Schedule Refreshed", "Today's assignments were refreshed. Review your schedule and tap check in again.");
      return;
    }

    if (isOffline && currentWorkersAssignments.length === 0) {
      Alert.alert("Connect to Refresh", "No assignments are loaded for today. Go online to pull today's schedule before checking in.");
      return;
    }

    if (!isOffline && user?.id && userCompanyId) {
      const liveAssignments = await fetchAssignmentsForWorkers(userCompanyId, today, [user.id]);
      if (liveAssignments.length === 0) {
        await fetchHomeData(true, today);
        Alert.alert("No Assignments Today", "You do not have any assignments scheduled for today.");
        return;
      }

      if (!liveAssignments.some((assignment) => assignment.id === relevantAssignment.id)) {
        await fetchHomeData(true, today);
        Alert.alert("Schedule Updated", "Your assignments changed. Review today's schedule and try checking in again.");
        return;
      }
    }

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
      const geofenceAssignmentsToStart = backgroundGeofenceAssignments.length > 0
        ? backgroundGeofenceAssignments
        : [{
            id: relevantAssignment.id,
            latitude: targetProjectLocation.lat,
            longitude: targetProjectLocation.lon,
            radius: ACCEPTABLE_DISTANCE,
            type: (relevantAssignment as any).type,
            status: 'active' as const,
          }];

      await BackgroundLocation.start(user!.id, relevantAssignment.id, userCompanyId!, JSON.stringify({ url: supabaseUrl, key: supabaseKey }), deviceToken!, deviceSecret!, JSON.stringify(geofenceAssignmentsToStart), projectLocationName);
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

  const handleNavigate = () => {
    if (!targetProjectLocation) return;
    const { lat, lon } = targetProjectLocation;
    const label = encodeURIComponent(projectLocationName);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lon}`,
      android: `geo:0,0?q=${lat},${lon}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
    });
    Linking.openURL(url);
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
        {/* Header */}
        <View style={styles.pageHeader}>
          <Logo style={styles.logo} />
          <Text style={styles.dateText}>{moment().format('ddd, MMM D')}</Text>
        </View>

        <View style={styles.homeContent}>
          {/* Status + Assignment card */}
          <View style={styles.mainCard}>
            <View style={styles.mainCardTop}>
              <View style={styles.mainCardLeft}>
                <Text style={styles.mainCardLabel} fontType="medium">
                  {stableCheckedIn ? 'Currently working at' : 'Next assignment'}
                </Text>
                {isDataLoading ? (
                  <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 8 }} />
                ) : relevantAssignment ? (
                  <>
                    <TouchableOpacity
                      onPress={() => !isSelectionLocked && setIsAssignmentSelectionModalVisible(true)}
                      disabled={isSelectionLocked}
                      style={styles.siteNameRow}
                    >
                      <Text style={styles.siteName} fontType="bold" numberOfLines={1}>{projectLocationName}</Text>
                      {!isSelectionLocked && <Ionicons name="chevron-down" size={16} color={theme.colors.bodyText} />}
                    </TouchableOpacity>
                    <Text style={styles.siteAddress} numberOfLines={1}>
                      {(relevantAssignment as any).project?.address || (relevantAssignment as any).location?.name || ''}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.siteName} fontType="bold">No assignments today</Text>
                )}
              </View>

              {statusBadgeInfo && (
                <View style={[styles.statusPill, {
                  backgroundColor: statusBadgeInfo.type === 'active' ? theme.colors.primary :
                                   statusBadgeInfo.type === 'success' ? theme.statusColors.successBackground :
                                   theme.statusColors.warningBackground
                }]}>
                  <View style={[styles.statusDot, {
                    backgroundColor: statusBadgeInfo.type === 'active' ? '#fff' :
                                     statusBadgeInfo.type === 'success' ? theme.statusColors.successText :
                                     theme.statusColors.warningText
                  }]} />
                  <Text style={[styles.statusPillText, {
                    color: statusBadgeInfo.type === 'active' ? '#fff' :
                           statusBadgeInfo.type === 'success' ? theme.statusColors.successText :
                           theme.statusColors.warningText
                  }]} fontType="bold">
                    {statusBadgeInfo.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Location / timer row */}
            {relevantAssignment && (
              <View style={styles.mainCardBottom}>
                {stableCheckedIn && sessionStartTime ? (
                  <View style={styles.sessionRow}>
                    <Ionicons name="time-outline" size={14} color={theme.colors.bodyText} />
                    <Text style={styles.sessionText}>
                      {` Started ${moment(sessionStartTime).format('h:mm A')} · ${Math.floor(elapsedTime / 3600)}h ${Math.floor((elapsedTime % 3600) / 60)}m`}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.sessionRow}>
                    <Ionicons name="location-outline" size={14} color={theme.colors.bodyText} />
                    <Text style={styles.sessionText}>{` ${locationStatusText}`}</Text>
                  </View>
                )}
                {!stableCheckedIn && targetProjectLocation && (
                  <TouchableOpacity onPress={handleNavigate} style={styles.navButton}>
                    <Ionicons name="navigate-outline" size={14} color={theme.colors.primary} />
                    <Text style={styles.navButtonText} fontType="bold"> Navigate</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Map — always show when there's a relevant assignment and not checked in, or show compact when checked in */}
          {relevantAssignment && targetProjectLocation && (
            <View style={[styles.mapCard, stableCheckedIn && styles.mapCardCheckedIn]}>
              {locationReady && workerMapLocation ? (
                <MapView
                  ref={mapRef}
                  style={StyleSheet.absoluteFillObject}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  showsUserLocation={true}
                  region={mapRegion}
                >
                  <Marker
                    coordinate={{ latitude: targetProjectLocation.lat, longitude: targetProjectLocation.lon }}
                    anchor={{ x: 0.5, y: 0.5 }}
                    pinColor={theme.colors.primary}
                  />
                  <Circle
                    center={{ latitude: targetProjectLocation.lat, longitude: targetProjectLocation.lon }}
                    radius={ACCEPTABLE_DISTANCE}
                    strokeWidth={2}
                    strokeColor={theme.colors.primary}
                    fillColor={theme.colors.primary + '20'}
                  />
                </MapView>
              ) : (
                <View style={styles.mapLoading}>
                  <ActivityIndicator color={theme.colors.primary} />
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Check in/out button */}
      <View style={styles.footer}>
        <Button
          onPress={stableCheckedIn ? handleCheckOut : handleCheckIn}
          style={[styles.actionButton, stableCheckedIn ? styles.checkOutBtn : styles.checkInBtn]}
          disabled={buttonDisabled || isActuallyProcessing}
          title={stableCheckedIn ? "Check Out" : (relevantAssignment ? "Check In" : "No Assignments")}
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
  scrollContent: {
    paddingBottom: 100,
  },
  pageHeader: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {},
  dateText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
  },
  homeContent: {
    paddingHorizontal: theme.spacing(3),
    gap: theme.spacing(2),
  },
  // Main assignment card
  mainCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    overflow: 'hidden',
  },
  mainCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: theme.spacing(2.5),
  },
  mainCardLeft: {
    flex: 1,
    marginRight: theme.spacing(1.5),
  },
  mainCardLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.disabledText,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  siteNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  siteName: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
    flexShrink: 1,
  },
  siteAddress: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    gap: 5,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
  },
  mainCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing(2.5),
    paddingVertical: theme.spacing(1.5),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: theme.spacing(1),
  },
  navButtonText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.primary,
  },
  // Map
  mapCard: {
    height: 220,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  mapCardCheckedIn: {
    height: 140,
  },
  mapLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing(2.5),
    paddingBottom: theme.spacing(3),
    backgroundColor: theme.colors.pageBackground,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  actionButton: {
    height: 50,
    borderRadius: theme.radius.md,
    width: '100%',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    overflow: 'hidden',
  },
  checkInBtn: {
    backgroundColor: theme.colors.primary,
  },
  checkOutBtn: {
    backgroundColor: theme.colors.danger,
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
  },
  // Permission screens
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
  pageTitle: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
  },
  pageSubtitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
});
