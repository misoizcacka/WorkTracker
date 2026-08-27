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
import BreakDurationModal from '../../components/BreakDurationModal';
import { View, Text } from '../../components/Themed';
import { Logo } from '~/components/Logo';
import { CircularTimer } from '~/components/CircularTimer';
import { GeofenceAssignment } from 'background-location';
import { fetchAssignmentsForWorkers } from '~/services/workerAssignments';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BATTERY_OPT_SHOWN_KEY = 'battery_opt_shown';

export default function Home() {
  const { user, userCompanyId, isCompanyIdLoading, deviceToken, deviceSecret, userCompanyName, refreshUser } = useSession();
  const { loadInitialProjects, isLoading: projectsLoading } = useProjects();
  const { t } = useTranslation();
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
  const [isBreakModalVisible, setIsBreakModalVisible] = useState(false);
  // Stores the GPS location captured when user taps "Check Out", used after break modal confirms
  const pendingCheckoutLocationRef = React.useRef<{ latitude: number; longitude: number } | null>(null);

  const { processedAssignments, loadAssignmentsForDate, loadWorkSessionsForDate, isLoading: assignmentsLoading, activeWorkSession, loadedWorkSessions, startWorkSession, endWorkSession, lastCheckoutAssignmentId, isOffline, isSyncingToCloud } = useAssignments();

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
          Alert.alert(t('worker.home.backgroundLocationRequired'), t('worker.home.backgroundLocationMsg'), [{ text: t('worker.batteryOptimization.openSettings'), onPress: () => Linking.openSettings() }]);
        }
        await Notifications.requestPermissionsAsync();
        // Show battery optimization prompt once on Android
        if (Platform.OS === 'android') {
          try {
            const alreadyShown = await AsyncStorage.getItem(BATTERY_OPT_SHOWN_KEY);
            if (!alreadyShown) {
              await AsyncStorage.setItem(BATTERY_OPT_SHOWN_KEY, 'true');
              Alert.alert(
                t('worker.batteryOptimization.title'),
                t('worker.batteryOptimization.message'),
                [
                  { text: t('worker.batteryOptimization.openSettings'), onPress: () => Linking.openSettings() },
                  { text: t('worker.batteryOptimization.later'), style: 'cancel' },
                ]
              );
            }
          } catch (_) {}
        }
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

    // Manual selection always wins — don't let location polling override it
    if (selectedNextAssignmentId) {
      const manuallySelected = currentWorkersAssignments.find(a => a.id === selectedNextAssignmentId) || null;
      return { relevantAssignment: manuallySelected, isSelectionLocked: false };
    }
    
    // Auto-select based on proximity only if user hasn't manually chosen
    if (assignmentAtCurrentLocation) {
      return { relevantAssignment: assignmentAtCurrentLocation, isSelectionLocked: false };
    }

    const lastCheckoutAss = currentWorkersAssignments.find((assign: ProcessedAssignmentStepWithStatus) => assign.id === lastCheckoutAssignmentId);
    return { relevantAssignment: lastCheckoutAss || nextAssignableAssignment || null, isSelectionLocked: false };
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
      if (isNearby) return { label: t('worker.home.statusWorking'), type: 'active' };
      return { label: t('worker.home.statusOffSite'), type: 'warning' };
    }
    if (relevantAssignment) {
      if (isNearby) return { label: t('worker.home.statusReady'), type: 'success' };
      return { label: t('worker.home.statusAway'), type: 'warning' };
    }
    return null;
  }, [stableCheckedIn, isNearby, relevantAssignment, t]);

  const locationStatusText = useMemo(() => {
    if (!relevantAssignment) return t('worker.home.noAssignmentsToday');
    if (!locationReady) return t('worker.home.locating');
    if (!targetProjectLocation) return t('worker.home.noLocationCoords');
    if (isNearby) return t('worker.home.atSite', { name: projectLocationName });
    const displayDistance = distance ?? 0;
    const formattedDistance = displayDistance > 1000 ? `${(displayDistance / 1000).toFixed(1)}km` : `${Math.round(displayDistance)}m`;
    return t('worker.home.distanceFrom', { distance: formattedDistance, name: projectLocationName });
  }, [relevantAssignment, locationReady, targetProjectLocation, isNearby, distance, projectLocationName, t]);

  useEffect(() => { fetchHomeData(); }, [fetchHomeData]);

  // Ensure the session token is always fresh when the screen loads — skip when offline
  useEffect(() => {
    if (!isOffline) refreshUser();
  }, [isOffline]);

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

  const startedSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const sessionId = activeWorkSession?.id ?? null;

    // Only start once per unique session — prevents re-firing when other deps change
    if (!sessionId || sessionId === startedSessionIdRef.current) {
      return;
    }
    if (!checkedIn || !user?.id || !userCompanyId || !deviceToken || !deviceSecret) {
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

    startedSessionIdRef.current = sessionId;
    BackgroundLocation.start(
      user.id,
      activeWorkSession!.assignment_id,
      userCompanyId,
      JSON.stringify({ url: supabaseUrl, key: supabaseKey, locationName: projectLocationName }),
      deviceToken,
      deviceSecret,
      JSON.stringify(backgroundGeofenceAssignments)
    ).catch((error) => {
      console.error('Failed to refresh background geofence assignments:', error);
      startedSessionIdRef.current = null; // Allow retry on failure
    });
  }, [activeWorkSession?.id, backgroundGeofenceAssignments, checkedIn, deviceSecret, deviceToken, user?.id, userCompanyId]);

  const handleCheckIn = async () => {
    if (checkedIn || !relevantAssignment || !targetProjectLocation) return;

    // 9-D: Lock the button immediately before any async work to prevent double-tap races.
    setIsProcessingCheckInOut(true);
    setPendingAction('checking_in');

    try {
      const today = moment().format('YYYY-MM-DD');
      if (currentDate !== today) {
        if (isOffline) {
          Alert.alert(t('worker.home.connectToRefresh'), t('worker.home.connectToRefreshMsg'));
          return;
        }
        setCurrentDate(today);
        await fetchHomeData(true, today);
        Alert.alert(t('worker.home.scheduleRefreshed'), t('worker.home.scheduleRefreshedMsg'));
        return;
      }

      if (isOffline && currentWorkersAssignments.length === 0) {
        Alert.alert(t('worker.home.connectToRefresh'), t('worker.home.connectToRefreshMsg'));
        return;
      }

      if (!isOffline && user?.id && userCompanyId) {
        let liveAssignments;
        try {
          liveAssignments = await fetchAssignmentsForWorkers(userCompanyId, today, [user.id]);
        } catch (fetchErr) {
          console.warn('handleCheckIn: could not verify live assignments, proceeding with cached data.', fetchErr);
          liveAssignments = null;
        }

        if (liveAssignments !== null) {
          if (liveAssignments.length === 0) {
            await fetchHomeData(true, today);
            Alert.alert(t('worker.home.noAssignmentsOnline'), t('worker.home.noAssignmentsOnlineMsg'));
            return;
          }
          if (!liveAssignments.some((assignment) => assignment.id === relevantAssignment.id)) {
            await fetchHomeData(true, today);
            Alert.alert(t('worker.home.scheduleUpdated'), t('worker.home.scheduleUpdatedMsg'));
            return;
          }
        }
      }

      const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') { Alert.alert(t('worker.home.backgroundLocationRequired'), t('worker.home.backgroundLocationMsg')); return; }

      let currentLocation;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        currentLocation = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      } catch (err) { return; }

      const d = getDistance(currentLocation, { latitude: targetProjectLocation.lat, longitude: targetProjectLocation.lon });
      if (d > ACCEPTABLE_DISTANCE) { Alert.alert(t('worker.home.tooFar'), t('worker.home.tooFarMsg', { name: projectLocationName })); return; }

      await startWorkSession(relevantAssignment.id, currentLocation);
      Toast.show({ type: 'success', text1: t('worker.home.checkedInToast'), text2: t('worker.home.checkedInToastSub', { name: projectLocationName }) });
      setSelectedNextAssignmentId(null);
    } catch (err: any) {
      Alert.alert(t('worker.home.checkInFailed'), err.message);
    } finally {
      setIsProcessingCheckInOut(false);
      setPendingAction(null);
    }
  };

  const handleCheckOut = async () => {
    if (!activeWorkSession) return;
    // Grab GPS first — before showing the modal so there's no delay after confirm
    let currentLocation;
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      currentLocation = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    } catch (err) { return; }

    // Store location and show break duration modal
    pendingCheckoutLocationRef.current = currentLocation;
    setIsBreakModalVisible(true);
  };

  const handleBreakConfirm = async (breakMinutes: number) => {
    const currentLocation = pendingCheckoutLocationRef.current;
    if (!activeWorkSession || !currentLocation) return;

    setIsBreakModalVisible(false);
    setIsProcessingCheckInOut(true);
    setPendingAction('checking_out');

    try {
      await endWorkSession(activeWorkSession.id, currentLocation, breakMinutes);
      await BackgroundLocation.stop();
      startedSessionIdRef.current = null;
      Toast.show({ type: 'info', text1: t('worker.home.checkedOutToast'), text2: t('worker.home.checkedOutToastSub', { name: projectLocationName }) });
      setElapsedTime(0);
      setSelectedNextAssignmentId(null);
    } catch (err: any) {
      Alert.alert(t('worker.home.checkOutFailed'), err.message);
    } finally {
      setIsProcessingCheckInOut(false);
      setPendingAction(null);
      pendingCheckoutLocationRef.current = null;
    }
  };

  const handleBreakCancel = () => {
    setIsBreakModalVisible(false);
    pendingCheckoutLocationRef.current = null;
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
    const assignment = currentWorkersAssignments.find(a => a.id === assignmentId) as any;
    if (!assignment) return;
    const lat = assignment.type === 'project' ? assignment.project?.location?.latitude : assignment.location?.latitude;
    const lon = assignment.type === 'project' ? assignment.project?.location?.longitude : assignment.location?.longitude;
    if (lat == null || lon == null) return;
    if (mapRef.current) {
      const latDelta = workerMapLocation ? Math.max(Math.abs(workerMapLocation.latitude - lat) * 1.5, 0.005) : 0.005;
      const lonDelta = workerMapLocation ? Math.max(Math.abs(workerMapLocation.longitude - lon) * 1.5, 0.005) : 0.005;
      mapRef.current.animateToRegion({
        latitude: workerMapLocation ? (workerMapLocation.latitude + lat) / 2 : lat,
        longitude: workerMapLocation ? (workerMapLocation.longitude + lon) / 2 : lon,
        latitudeDelta: latDelta,
        longitudeDelta: lonDelta,
      }, 600);
    }
  };

  if (locationPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>{t('worker.home.checkingPermissions')}</Text>
      </View>
    );
  }

  if (locationPermission !== 'granted') {
    return (
      <View style={styles.centered}>
        <Ionicons name="location-outline" size={64} color={theme.colors.primary} />
        <Text style={styles.pageTitle} fontType="bold">{t('worker.home.locationRequired')}</Text>
        <Text style={styles.pageSubtitle}>{t('worker.home.locationRequiredSub')}</Text>
        <Button title={t('worker.home.grantPermission')} onPress={requestPermissionAgain} style={{ marginTop: 20 }} />
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
          <Logo />
          <View style={styles.headerRight}>
            {isSyncingToCloud && (
              <View style={styles.syncPill}>
                <ActivityIndicator size="small" color={theme.colors.bodyText} style={{ transform: [{ scale: 0.6 }] }} />
                <Text style={styles.syncText} fontType="medium">{t('worker.home.syncing')}</Text>
              </View>
            )}
            <Text style={styles.dateText}>{moment().format('ddd, MMM D')}</Text>
          </View>
        </View>

        {/* Offline banner */}
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={14} color="#92400E" />
            <Text style={styles.offlineBannerText} fontType="medium">
              {stableCheckedIn ? t('worker.home.offlineBannerCheckedIn') : t('worker.home.offlineBanner')}
            </Text>
          </View>
        )}

        <View style={styles.homeContent}>
          {/* Status + Assignment card */}
          <View style={styles.mainCard}>
            <View style={styles.mainCardTop}>
              <View style={styles.mainCardLeft}>
                <Text style={styles.mainCardLabel} fontType="medium">
                  {stableCheckedIn ? t('worker.home.currentlyWorkingAt') : t('worker.home.nextAssignment')}
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
                  <View style={styles.emptyAssignment}>
                    <Ionicons name="calendar-outline" size={28} color={theme.colors.disabledText} />
                    <View style={styles.emptyAssignmentText}>
                      <Text style={styles.emptyAssignmentTitle} fontType="bold">{t('worker.home.noAssignmentsToday')}</Text>
                      <Text style={styles.emptyAssignmentSub}>{t('worker.home.noAssignmentsSub')}</Text>
                    </View>
                  </View>
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
                      {` ${t('worker.home.sessionStarted', { time: moment(sessionStartTime).format('h:mm A') })} · ${Math.floor(elapsedTime / 3600)}h ${Math.floor((elapsedTime % 3600) / 60)}m`}
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
                    <Text style={styles.navButtonText} fontType="bold"> {t('worker.home.navigate')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Timer when checked in, map when not */}
          {stableCheckedIn && sessionStartTime ? (
            <View style={styles.timerCard}>
              <CircularTimer elapsedTime={elapsedTime} size={200} strokeWidth={6} />
            </View>
          ) : (
            // Keep MapView always mounted so isMounted stays true and animateToRegion works.
            // Just hide the card when there's nothing to show.
            <View style={[styles.mapCard, (!relevantAssignment || !targetProjectLocation) && { display: 'none' }]}>
              {locationReady && workerMapLocation ? (
                <MapView
                  ref={mapRef}
                  style={StyleSheet.absoluteFillObject}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  showsUserLocation={true}
                  region={mapRegion}
                >
                  {targetProjectLocation && (
                    <>
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
                    </>
                  )}
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
          title={stableCheckedIn ? t('worker.home.checkOut') : (relevantAssignment ? t('worker.home.checkIn') : t('worker.home.noAssignments'))}
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
      <BreakDurationModal
        visible={isBreakModalVisible}
        workedMinutes={activeWorkSession
          ? Math.floor((Date.now() - new Date(activeWorkSession.start_time).getTime()) / 60000)
          : 0
        }
        onConfirm={handleBreakConfirm}
        onCancel={handleBreakCancel}
        isLoading={isProcessingCheckInOut}
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
    backgroundColor: theme.colors.pageBackground,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 2,
  },
  syncText: {
    fontSize: 11,
    color: theme.colors.bodyText,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: theme.spacing(3),
    paddingVertical: 8,
  },
  offlineBannerText: {
    fontSize: theme.fontSizes.sm,
    color: '#92400E',
  },
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
  emptyAssignment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    paddingVertical: theme.spacing(1),
  },
  emptyAssignmentText: {
    flex: 1,
  },
  emptyAssignmentTitle: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  emptyAssignmentSub: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.disabledText,
    marginTop: 2,
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
  // Timer (shown instead of map when checked in)
  timerCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
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
