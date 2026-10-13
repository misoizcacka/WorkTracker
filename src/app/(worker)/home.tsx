import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { StyleSheet, Alert, ScrollView, ActivityIndicator, Linking, TouchableOpacity, RefreshControl, Platform, Image, AppState } from "react-native";
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
  // iOS only: seconds since last native location tick â€” >600 means process was force-swiped
  const [trackingGapSeconds, setTrackingGapSeconds] = useState<number | null>(null);

  const { processedAssignments, loadAssignmentsForDate, loadWorkSessionsForDate, isLoading: assignmentsLoading, activeWorkSession, loadedWorkSessions, startWorkSession, endWorkSession, lastCheckoutAssignmentId, isOffline, isSyncingToCloud } = useAssignments();

  const isDataLoading = assignmentsLoading || projectsLoading;
  const DEFAULT_RADIUS = 150; // meters â€” fallback when no per-project radius is set

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
      const ass = assign as any;
      const loc = ass.project?.location || ass.location;
      if (!loc) return false;
      const d = getDistance(
        { latitude: workerMapLocation.latitude, longitude: workerMapLocation.longitude },
        { latitude: loc.latitude, longitude: loc.longitude }
      );
      const radius = ass.type === 'project'
        ? (ass.project?.check_in_radius ?? DEFAULT_RADIUS)
        : DEFAULT_RADIUS;
      return d < radius;
    }) || null;
  }, [workerMapLocation, currentWorkersAssignments, DEFAULT_RADIUS]);

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

    // Manual selection always wins â€” don't let location polling override it
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

      const radius = ass.type === 'project'
        ? (ass.project?.check_in_radius ?? DEFAULT_RADIUS)
        : DEFAULT_RADIUS;

      return [{
        id: assignment.id,
        latitude,
        longitude,
        radius,
        type: ass.type,
        status: assignment.id === activeWorkSession?.assignment_id ? 'active' : assignment.status,
      }];
    });

    if (relevantAssignment && !geofences.some((assignment) => assignment.id === relevantAssignment.id) && targetProjectLocation) {
      const ass = relevantAssignment as any;
      const radius = ass.type === 'project'
        ? (ass.project?.check_in_radius ?? DEFAULT_RADIUS)
        : DEFAULT_RADIUS;
      geofences.unshift({
        id: relevantAssignment.id,
        latitude: targetProjectLocation.lat,
        longitude: targetProjectLocation.lon,
        radius,
        type: ass.type,
        status: relevantAssignment.id === activeWorkSession?.assignment_id ? 'active' : relevantAssignment.status,
      });
    }

    return geofences;
  }, [activeWorkSession?.assignment_id, currentWorkersAssignments, relevantAssignment, targetProjectLocation]);

  const relevantRadius = useMemo(() => {
    const ass = relevantAssignment as any;
    if (!ass) return DEFAULT_RADIUS;
    return ass.type === 'project'
      ? (ass.project?.check_in_radius ?? DEFAULT_RADIUS)
      : DEFAULT_RADIUS;
  }, [relevantAssignment, DEFAULT_RADIUS]);

  const isNearby = distance !== null && distance < relevantRadius;

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

  // Ensure the session token is always fresh when the screen loads â€” skip when offline
  useEffect(() => {
    if (!isOffline) refreshUser();
  }, [isOffline]);

  // iOS only: detect tracking gaps caused by force-swipe.
  // When the app comes to the foreground and a work session is active, ask the
  // native module how long ago it last received a live location update.
  // A gap > 10 minutes means the process was killed (force-swipe or OS kill) and
  // geofencing was paused until iOS relaunched us. Show a warning so the worker knows.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const checkGap = async () => {
      if (!checkedIn) { setTrackingGapSeconds(null); return; }
      try {
        const diag = await BackgroundLocation.getDiagnostics();
        const gap = (diag as any).trackingGapSeconds as number | undefined;
        setTrackingGapSeconds(typeof gap === 'number' ? gap : null);
      } catch {
        setTrackingGapSeconds(null);
      }
    };

    checkGap();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkGap();
    });
    return () => sub.remove();
  }, [checkedIn]);

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

    // Only start once per unique session â€” prevents re-firing when other deps change
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
      if (d > relevantRadius) { Alert.alert(t('worker.home.tooFar'), t('worker.home.tooFarMsg', { name: projectLocationName })); return; }

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
    // Grab GPS first â€” before showing the modal so there's no delay after confirm
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

  // Proximity ratio: 0 = far, 1 = on site
  const proximityRatio = (() => {
    if (!targetProjectLocation || distance === null) return 0;
    if (isNearby) return 1;
    const approachZone = relevantRadius * 4;
    return Math.max(0, 1 - (distance - relevantRadius) / approachZone);
  })();

  const proximityColor = isNearby
    ? theme.colors.success
    : proximityRatio > 0.6
      ? '#F59E0B'
      : theme.colors.disabledText;

  const circleButtonActive = stableCheckedIn || isNearby;

  return (
    <AnimatedScreen>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
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

        {/* iOS tracking-gap banner */}
        {Platform.OS === 'ios' && stableCheckedIn && trackingGapSeconds !== null && trackingGapSeconds > 600 && (
          <View style={styles.trackingGapBanner}>
            <Ionicons name="warning-outline" size={14} color="#92400E" />
            <Text style={styles.trackingGapBannerText} fontType="medium">
              {t('worker.home.trackingPausedBanner', {
                minutes: Math.round(trackingGapSeconds / 60),
                defaultValue: `Location tracking was paused for ~${Math.round(trackingGapSeconds / 60)} min (app was closed). Your hours are still recorded.`,
              })}
            </Text>
          </View>
        )}

        {/* MAIN CONTENT */}
        <View style={styles.homeContent}>

          {/* Project info card */}
          {!isDataLoading && relevantAssignment ? (
            <View style={styles.projectCard}>
              <Text style={styles.projectCardLabel} fontType="medium">
                {stableCheckedIn ? t('worker.home.currentlyWorkingAt') : t('worker.home.nextAssignment')}
              </Text>
              <TouchableOpacity
                onPress={() => !isSelectionLocked && setIsAssignmentSelectionModalVisible(true)}
                disabled={isSelectionLocked}
                style={styles.projectNameRow}
              >
                <Text style={styles.projectName} fontType="bold" numberOfLines={1}>{projectLocationName}</Text>
                {!isSelectionLocked && <Ionicons name="chevron-down" size={16} color={theme.colors.bodyText} />}
              </TouchableOpacity>
              {!stableCheckedIn && (
                <View style={styles.projectCardBottom}>
                  <Text style={styles.projectAddress} numberOfLines={1}>
                    {(relevantAssignment as any).project?.address || (relevantAssignment as any).location?.name || ''}
                  </Text>
                  {targetProjectLocation && (
                    <TouchableOpacity onPress={handleNavigate} style={styles.navigateBtn}>
                      <Ionicons name="navigate-outline" size={13} color={theme.colors.primary} />
                      <Text style={styles.navigateBtnText} fontType="bold">{t('worker.home.navigate')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {stableCheckedIn && sessionStartTime && (
                <Text style={styles.sessionStartText}>
                  {t('worker.home.sessionStarted', { time: moment(sessionStartTime).format('h:mm A') })}
                </Text>
              )}
            </View>
          ) : !isDataLoading ? (
            <View style={styles.emptyProjectCard}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.disabledText} />
              <Text style={styles.emptyProjectText} fontType="medium">{t('worker.home.noAssignmentsToday')}</Text>
            </View>
          ) : null}

          {/* Circle check-in button */}
          <View style={styles.circleSection}>
            <View style={[
              styles.circleOuter,
              stableCheckedIn ? styles.circleOuterCheckedIn : circleButtonActive ? styles.circleOuterReady : styles.circleOuterFar,
            ]}>
              <TouchableOpacity
                onPress={stableCheckedIn ? handleCheckOut : handleCheckIn}
                disabled={(!isNearby && !stableCheckedIn) || buttonDisabled || isActuallyProcessing}
                style={[
                  styles.circleButton,
                  stableCheckedIn ? styles.circleButtonCheckedIn : circleButtonActive ? styles.circleButtonReady : styles.circleButtonFar,
                ]}
                activeOpacity={0.85}
              >
                {isActuallyProcessing ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : stableCheckedIn && sessionStartTime ? (
                  <>
                    <Text style={styles.circleTimer} fontType="medium">
                      {`${Math.floor(elapsedTime / 3600).toString().padStart(2, '0')}:${Math.floor((elapsedTime % 3600) / 60).toString().padStart(2, '0')}:${(elapsedTime % 60).toString().padStart(2, '0')}`}
                    </Text>
                    <Text style={styles.circleSubLabel}>{t('worker.home.timeElapsed') || 'time elapsed'}</Text>
                  </>
                ) : (
                  <Text style={[styles.circleLabel, !circleButtonActive && styles.circleLabelDisabled]} fontType="medium">
                    {isDataLoading ? '...' : !relevantAssignment ? t('worker.home.noAssignments') : t('worker.home.checkIn')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Check out button */}
            {stableCheckedIn && (
              <TouchableOpacity
                onPress={handleCheckOut}
                disabled={buttonDisabled || isActuallyProcessing}
                style={styles.checkOutButton}
              >
                <Ionicons name="stop-circle-outline" size={18} color="#fff" />
                <Text style={styles.checkOutButtonText} fontType="bold">{t('worker.home.checkOut')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Proximity indicator */}
          {!stableCheckedIn && relevantAssignment && targetProjectLocation && (
            <View style={styles.proximityCard}>
              <View style={styles.proximityTopRow}>
                <Text style={[styles.proximityStatusText, { color: proximityColor }]} fontType="medium">
                  {isNearby
                    ? (t('worker.home.statusReady') || 'Ready to check in')
                    : !locationReady
                      ? (t('worker.home.locating') || 'Getting location...')
                      : (t('worker.home.statusAway') || 'Not on site')}
                </Text>
                {!isNearby && locationReady && distance !== null ? (
                  <Text style={[styles.proximityDistance, { color: proximityColor }]} fontType="bold">
                    {distance > 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`}
                  </Text>
                ) : isNearby ? (
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
                ) : null}
              </View>
              <View style={styles.proximityBarTrack}>
                <View style={[styles.proximityBarFill, {
                  width: `${Math.round(proximityRatio * 100)}%` as any,
                  backgroundColor: proximityColor,
                }]} />
              </View>
              {!isNearby && locationReady && (
                <Text style={styles.proximityHint}>
                  {`${t('worker.home.checkInRadius') || 'Check-in zone'}: ${relevantRadius}m`}
                </Text>
              )}
            </View>
          )}

        </View>{/* proximityCard */}
          </View>{/* homeContent */}
      </ScrollView>

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

const CIRCLE_SIZE = 200;

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: theme.spacing(5), flexGrow: 1 },
  pageHeader: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 2,
  },
  syncText: { fontSize: 11, color: theme.colors.bodyText },
  dateText: { fontSize: theme.fontSizes.sm, color: theme.colors.bodyText },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: theme.spacing(3),
    paddingVertical: 8,
    gap: 6,
  },
  offlineBannerText: { fontSize: theme.fontSizes.sm, color: '#92400E', flex: 1 },
  trackingGapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: theme.spacing(3),
    paddingVertical: 8,
    gap: 6,
  },
  trackingGapBannerText: { fontSize: theme.fontSizes.sm, color: '#92400E', flex: 1 },
  homeContent: {
    paddingHorizontal: theme.spacing(3),
    gap: theme.spacing(2.5),
    paddingTop: theme.spacing(1),
  },

  // Project card
  projectCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(2.5),
  },
  projectCardLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.disabledText,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  projectNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  projectName: { fontSize: 18, color: theme.colors.headingText, flexShrink: 1 },
  projectCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  projectAddress: { fontSize: theme.fontSizes.sm, color: theme.colors.bodyText, flex: 1 },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    marginLeft: 8,
  },
  navigateBtnText: { fontSize: theme.fontSizes.sm, color: theme.colors.primary },
  sessionStartText: { fontSize: theme.fontSizes.sm, color: theme.colors.disabledText, marginTop: 4 },
  emptyProjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(2),
  },
  emptyProjectText: { fontSize: theme.fontSizes.md, color: theme.colors.disabledText },

  // Circle section
  circleSection: { alignItems: 'center', paddingVertical: theme.spacing(2), gap: theme.spacing(2) },
  circleOuter: {
    width: CIRCLE_SIZE + 24,
    height: CIRCLE_SIZE + 24,
    borderRadius: (CIRCLE_SIZE + 24) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  circleOuterReady: { borderColor: 'rgba(0,0,0,0.15)', backgroundColor: 'rgba(0,0,0,0.04)' },
  circleOuterCheckedIn: { borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'rgba(0,0,0,0.04)' },
  circleOuterFar: { borderColor: theme.colors.borderColor, backgroundColor: 'transparent' },
  circleButton: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 6,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  circleButtonReady: { backgroundColor: theme.colors.primary, borderColor: 'rgba(255,255,255,0.15)' },
  circleButtonCheckedIn: { backgroundColor: '#1a1a1a', borderColor: 'rgba(255,255,255,0.1)' },
  circleButtonFar: { backgroundColor: '#e8e8e8', borderColor: theme.colors.borderColor, shadowOpacity: 0.08, elevation: 4 },
  circleTimer: { fontSize: 28, color: '#fff', letterSpacing: 1, textAlign: 'center' },
  circleSubLabel: { fontSize: theme.fontSizes.xs, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
  circleLabel: { fontSize: theme.fontSizes.lg, color: '#fff', textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center', paddingHorizontal: theme.spacing(1) },
  circleLabelDisabled: { color: theme.colors.disabledText },
  checkOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.danger,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(1.5),
    borderRadius: theme.radius.pill,
  },
  checkOutButtonText: { fontSize: theme.fontSizes.md, color: '#fff' },

  // Proximity card
  proximityCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(2),
    gap: theme.spacing(1.5),
  },
  proximityTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  proximityStatusText: { fontSize: theme.fontSizes.md, flex: 1 },
  proximityDistance: { fontSize: 22, letterSpacing: -0.5 },
  proximityBarTrack: { width: '100%', height: 6, backgroundColor: theme.colors.borderColor, borderRadius: theme.radius.pill, overflow: 'hidden' },
  proximityBarFill: { height: 6, borderRadius: theme.radius.pill, minWidth: 6 },
  proximityHint: { fontSize: theme.fontSizes.xs, color: theme.colors.disabledText },

  // Permission screens
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: theme.colors.bodyText },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  pageTitle: { fontSize: theme.fontSizes.xl, color: theme.colors.headingText, marginTop: theme.spacing(2), textAlign: 'center' },
  pageSubtitle: { fontSize: theme.fontSizes.md, color: theme.colors.bodyText, marginTop: 6, textAlign: 'center' },
});
