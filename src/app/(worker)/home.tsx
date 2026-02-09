import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { StyleSheet, Alert, ScrollView, ActivityIndicator, Linking, TouchableOpacity, RefreshControl } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as BackgroundLocation from 'background-location';
import { getDistance } from "geolib";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { CircularTimer } from "../../components/CircularTimer";
import AnimatedScreen from "../../components/AnimatedScreen";
import { theme } from "../../theme";
import { MapView, Marker, Circle } from '../../components/MapView'; // Custom MapView component
import { useSession } from '~/context/AuthContext';
import { useAssignments } from '~/context/AssignmentsContext';
import { ProcessedAssignmentStep, WorkSession, ProcessedAssignmentStepWithStatus, AssignmentStatus } from '~/types'; // Updated import
import moment from 'moment';
import Toast from 'react-native-toast-message';
import { saveLocalTransitionEvent, TransitionEventType } from '~/utils/localTransitionEvents'; // Import local event utility
import AssignmentSelectionModal from '../../components/AssignmentSelectionModal'; // Import AssignmentSelectionModal
import { View, Text } from '../../components/Themed'; // Custom Text component for consistent fonts

export default function Home() {
  const { user, userCompanyId, isCompanyIdLoading, session } = useSession();
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
  const [outOfRange, setOutOfRange] = useState(false);
  const [isAssignmentSelectionModalVisible, setIsAssignmentSelectionModalVisible] = useState(false);
  const [selectedNextAssignmentId, setSelectedNextAssignmentId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false); // New state for pull-to-refresh

  const { processedAssignments, loadAssignmentsForDate, loadWorkSessionsForDate, isLoading: assignmentsLoading, activeWorkSession, startWorkSession, endWorkSession, updateWorkSessionAssignment, lastCheckoutAssignmentId } = useAssignments();

  const ACCEPTABLE_DISTANCE = 150; // meters

  // Function to load home screen data, including assignments and work sessions
  const fetchHomeData = useCallback(async (forceFetchFromSupabase = false) => {
    if (user?.id) {
      // If there is an active session, load data for THAT session's date.
      if (activeWorkSession && activeWorkSession.worker_assignments) {
        const dateToLoad = activeWorkSession.worker_assignments.assigned_date;
        await loadAssignmentsForDate(dateToLoad, [user.id], forceFetchFromSupabase);
        await loadWorkSessionsForDate(dateToLoad, user.id);
      }
      // If there is no active session (and we have finished loading it), load data for TODAY.
      else if (activeWorkSession === null) {
        await loadAssignmentsForDate(currentDate, [user.id], forceFetchFromSupabase);
        await loadWorkSessionsForDate(currentDate, user.id);
      }
      // If activeWorkSession is undefined, we are still loading it, so do nothing.
    }
  }, [user?.id, activeWorkSession, loadAssignmentsForDate, loadWorkSessionsForDate, currentDate]); // Dependencies for useCallback

  // Handle pull-to-refresh action
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true); // Start refreshing indicator
    await fetchHomeData(true); // Force fetch new data from Supabase
    setIsRefreshing(false); // Stop refreshing indicator
  }, [fetchHomeData]); // Dependency for useCallback

  // Update date state if the day changes
  useEffect(() => {
    const interval = setInterval(() => {
      const today = moment().format('YYYY-MM-DD');
      if (today !== currentDate) {
        setCurrentDate(today);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [currentDate]);

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);

      if (status === 'granted') {
        const { status: notifStatus } = await Notifications.requestPermissionsAsync();
        if (notifStatus !== "granted") {
          Alert.alert("Permission required", "Notification access is needed for alerts.");
        }
      }
    })();
  }, []);
  
  const requestPermissionAgain = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status);
    if (status !== 'granted') {
        Alert.alert(
            "Permission Required",
            "Location access is essential for this app to function. Please enable it in your settings.",
            [{ text: "Open Settings", onPress: () => Linking.openSettings() }]
        );
    }
  };

  // Derive checkedIn and sessionStartTime from activeWorkSession
  const checkedIn = !!activeWorkSession;
  const sessionStartTime = activeWorkSession ? new Date(activeWorkSession.start_time).getTime() : null;

  const currentWorkersAssignments = useMemo(() => {
    return user?.id ? processedAssignments[user.id] || [] : [];
  }, [user?.id, processedAssignments]);

  // Logic to find the *current* assignment being worked on (if any) and the *next* possible assignment
  const { currentActiveAssignment, nextAssignableAssignment, currentAssignmentIndex } = useMemo(() => {
    let currentActive: ProcessedAssignmentStepWithStatus | null = null;
    let nextAssignable: ProcessedAssignmentStepWithStatus | null = null;
    let currentIdx = -1;

    if (!user?.id || currentWorkersAssignments.length === 0) {
      return { currentActiveAssignment: null, nextAssignableAssignment: null, currentAssignmentIndex: -1 };
    }

    currentActive = currentWorkersAssignments.find((assign: ProcessedAssignmentStepWithStatus) => assign.status === 'active') || null;
    nextAssignable = currentWorkersAssignments.find((assign: ProcessedAssignmentStepWithStatus) => assign.status === 'next') || null;

    if (currentActive) {
      currentIdx = currentWorkersAssignments.indexOf(currentActive);
    } else if (nextAssignable) {
      currentIdx = currentWorkersAssignments.indexOf(nextAssignable);
    }

    return { currentActiveAssignment: currentActive, nextAssignableAssignment: nextAssignable, currentAssignmentIndex: currentIdx };
  }, [user?.id, currentWorkersAssignments]);

  // Determine the relevant assignment to display and check-in to
  const { relevantAssignment, isSelectionLocked } = useMemo(() => {
    let assignmentToDisplay: ProcessedAssignmentStepWithStatus | null = null;
    let locked = false;

    if (checkedIn) {
      assignmentToDisplay = currentActiveAssignment;
      locked = true; // Cannot select new assignment if already checked in
    } else {
      // If not checked in, selection is never locked for the modal.
      // The `lastCheckoutAssignmentId` will only influence the suggested assignment.
      locked = false;

      const lastCheckoutAss = currentWorkersAssignments.find(
        (assign: ProcessedAssignmentStepWithStatus) => assign.id === lastCheckoutAssignmentId
      );

      if (selectedNextAssignmentId) {
        // If user manually selected an assignment, use it.
        assignmentToDisplay = currentWorkersAssignments.find(
          (assign: ProcessedAssignmentStepWithStatus) => assign.id === selectedNextAssignmentId
        ) || null;
      } else if (lastCheckoutAss) {
        // If there's a last checkout assignment, suggest re-checking into it as the default.
        assignmentToDisplay = lastCheckoutAss;
      } else {
        // Default to the system-determined next assignable assignment.
        assignmentToDisplay = nextAssignableAssignment;
      }
    }

    return { relevantAssignment: assignmentToDisplay, isSelectionLocked: locked };
  }, [checkedIn, lastCheckoutAssignmentId, selectedNextAssignmentId, currentActiveAssignment, nextAssignableAssignment, currentWorkersAssignments]);

  // The project location for geofencing is always the *relevant* one
  const targetProjectLocation = useMemo(() => { // Renamed from projectLocation to avoid re-declaration
    const targetAssignmentForGeofence = relevantAssignment;
    if (targetAssignmentForGeofence?.type === 'project' && targetAssignmentForGeofence.project) {
      return { lat: targetAssignmentForGeofence.project.location.latitude, lon: targetAssignmentForGeofence.project.location.longitude };
    }
    if (targetAssignmentForGeofence?.type === 'common_location' && targetAssignmentForGeofence.location) {
      return { lat: targetAssignmentForGeofence.location.latitude ?? 0, lon: targetAssignmentForGeofence.location.longitude ?? 0 };
    }
    return null;
  }, [relevantAssignment]);

  const projectLocationName = useMemo(() => {
    const targetAssignmentForGeofence = relevantAssignment;
    if (targetAssignmentForGeofence?.type === 'project' && targetAssignmentForGeofence.project) {
      return targetAssignmentForGeofence.project.name;
    }
    if (targetAssignmentForGeofence?.type === 'common_location' && targetAssignmentForGeofence.location) {
      return targetAssignmentForGeofence.location.name;
    }
    return "Project Site";
  }, [relevantAssignment]);

  const projectLocationAddress = useMemo(() => {
    const targetAssignmentForGeofence = relevantAssignment;
    if (targetAssignmentForGeofence?.type === 'project' && targetAssignmentForGeofence.project) {
      return targetAssignmentForGeofence.project.address;
    }
    return "";
  }, [relevantAssignment]);

  const isNearby = distance !== null && distance < ACCEPTABLE_DISTANCE;

  // Location status text for the bottom of the map
  const locationStatusText = useMemo(() => {
    if (!relevantAssignment) {
      return "No assignment with location to track.";
    }
    if (!locationReady) {
      return "Fetching location...";
    }
    if (!targetProjectLocation) {
        return "No valid location for assignment.";
    }

    if (isNearby) {
      return `At the work site: ${relevantAssignment?.type === 'project' ? relevantAssignment?.project?.name : relevantAssignment?.location?.name}`;
    } else {
      return `📏 ${Math.round(distance ?? 0)}m away from ${relevantAssignment?.type === 'project' ? relevantAssignment?.project?.name : relevantAssignment?.location?.name}`;
    }
  }, [relevantAssignment, locationReady, targetProjectLocation, isNearby, distance]);

    // Fetch assignments and work sessions based on the user's check-in status
    useEffect(() => {
      fetchHomeData(); // Use the encapsulated fetch function
    }, [fetchHomeData]); // Dependency for useEffect
  // ⏱ Track elapsed time
  useEffect(() => {
    let timer: number;
    if (checkedIn && sessionStartTime) {
      timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [checkedIn, sessionStartTime]);

  // 📍 Fetch foreground location for map display when not checked in
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined; // Use NodeJS.Timeout for clarity
    let isMounted = true; // To prevent state updates on unmounted component

    const fetchAndSetLocation = async () => {
      if (!isMounted) return; // Don't proceed if component is unmounted

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const { latitude, longitude } = location.coords;
        const newWorkerLocation = { latitude, longitude };

        if (isMounted) {
          setWorkerMapLocation(newWorkerLocation);
          if (!locationReady) {
            setLocationReady(true);
          }

          // Calculate distance here for debugging
          let d: number | null = null;
          if (targetProjectLocation) {
            d = getDistance(
              newWorkerLocation,
              { latitude: targetProjectLocation.lat, longitude: targetProjectLocation.lon }
            );
            setDistance(d); // Update distance state for map display
          } else {
            setDistance(null);
          }
          console.log("Foreground Location Update:");
          console.log("  Worker Location:", newWorkerLocation);
          console.log("  Target Project Location:", targetProjectLocation);
          console.log("  Calculated Distance:", d, "meters");
        }
      } catch (error) {
        console.error("Failed to get foreground location for map:", error);
        if (isMounted) {
          setLocationReady(false);
          setDistance(null); // Reset distance on error
        }
      }
    };

    if (!checkedIn && locationPermission === 'granted') {
      fetchAndSetLocation(); // Fetch immediately on mount/check-out
      intervalId = setInterval(fetchAndSetLocation, 10000); // Update every 10 seconds
    } else {
      // If checked in, or permissions not granted, ensure we clean up any existing interval
      if (intervalId) {
        clearInterval(intervalId);
      }
      // Optionally, reset workerMapLocation and locationReady when checked in,
      // but let's keep them as is for now to avoid flickering if checkedIn state changes rapidly.
    }

    return () => {
      isMounted = false; // Mark component as unmounted
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [checkedIn, locationPermission, relevantAssignment, targetProjectLocation]); // Added relevantAssignment, targetProjectLocation to dependencies







  const handleCheckIn = async () => {
    if (checkedIn) {
      Alert.alert("Already Checked In", `You are already checked into ${relevantAssignment?.type === 'project' ? relevantAssignment?.project?.name : relevantAssignment?.location?.name}.`);
      return;
    }
    if (!relevantAssignment) {
      Alert.alert("No Assignment", "No assignments available for check-in today.");
      return;
    }
    if (!targetProjectLocation) {
      Alert.alert("Location Missing", `Assignment ${projectLocationName} has no valid location. Cannot check in.`);
      return;
    }

    // Fetch current location right before check-in to ensure accuracy
    let currentLocation;
    try {
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      currentLocation = { latitude: locationResult.coords.latitude, longitude: locationResult.coords.longitude };
    } catch (err) {
      console.error("Failed to get current location for check-in:", err);
      Alert.alert("Location Error", "Could not get your current location. Please ensure location services are enabled and permissions are granted.");
      return;
    }

    // Recalculate distance with the fresh location
    let d: number | null = null;
    if (targetProjectLocation) {
      d = getDistance(
        { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
        { latitude: targetProjectLocation.lat, longitude: targetProjectLocation.lon }
      );
    }

    if (d === null || d > ACCEPTABLE_DISTANCE) {
      Alert.alert("Too far", `You must be at ${projectLocationName} to check in. You are ${Math.round(d ?? 0)}m away.`);
      return;
    }

    try {
      await startWorkSession(relevantAssignment.id, currentLocation);
      
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined;
      const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined;

      let errorMessage = '';
      if (!user?.id) errorMessage = 'User ID is missing.';
      else if (isCompanyIdLoading) errorMessage = 'Company ID is still loading.';
      else if (!userCompanyId) errorMessage = 'Company ID is missing for user.';
      else if (!relevantAssignment?.id) errorMessage = 'Relevant assignment ID is missing.';
      else if (!supabaseUrl) errorMessage = 'Supabase URL is missing from configuration.';
      else if (!supabasePublishableKey) errorMessage = 'Supabase Publishable Key is missing from configuration.';
      else if (!session?.access_token) errorMessage = 'User access token is missing for authentication.';

      if (errorMessage) {
        console.error("BackgroundLocation Configuration Error:", errorMessage);
        Toast.show({
          type: 'error',
          text1: 'Configuration Error',
          text2: 'An application configuration error occurred. Please try again.',
        });
        return;
      }

      BackgroundLocation.start(
        user.id,
        relevantAssignment.id,
        userCompanyId,
        supabaseUrl,
        supabasePublishableKey,
        session.access_token
      );
      Toast.show({
        type: 'success',
        text1: 'Checked In',
        text2: `You are now working on ${projectLocationName}.`
      });
      setSelectedNextAssignmentId(null); // Clear manual selection on successful check-in
    } catch (err: any) {
      Alert.alert("Check-in Failed", err.message || "An error occurred during check-in.");
    }
  };

  const handleCheckOut = async () => {
    if (!activeWorkSession) {
      Alert.alert("Not Checked In", "You are not currently checked in.");
      return;
    }

    // Fetch current location right before check-out to ensure accuracy
    let currentLocation;
    try {
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      currentLocation = { latitude: locationResult.coords.latitude, longitude: locationResult.coords.longitude };
    } catch (err) {
      console.error("Failed to get current location for check-out:", err);
      Alert.alert("Location Error", "Could not get your current location. Please ensure location services are enabled and permissions are granted.");
      return;
    }

    try {
      await endWorkSession(activeWorkSession.id, currentLocation);
      BackgroundLocation.stop(); // Stop background location tracking
      Toast.show({
        type: 'info',
        text1: 'Checked Out',
        text2: `You have successfully checked out from ${projectLocationName}.`
      });
      setElapsedTime(0); // Reset timer
      notificationSentRef.current = false; // Reset notification lock
      setOutOfRange(false); // Reset out of range of assignment
      setSelectedNextAssignmentId(null); // Clear manual selection on successful check-out
    } catch (err: any) {
      Alert.alert("Check-out Failed", err.message || "An error occurred during check-out.");
    }
  };



  // Determine button state and text
  const buttonDisabled = assignmentsLoading || (checkedIn ? false : (!isNearby || !relevantAssignment || !targetProjectLocation)); // Changed to targetProjectLocation
  const buttonTitle = checkedIn ? "Check Out" : (relevantAssignment ? "Check In" : "No Next Assignment");




  useEffect(() => {
    if (workerMapLocation && targetProjectLocation) { // Changed to targetProjectLocation
      const { latitude: userLat, longitude: userLon } = workerMapLocation;
      const { lat: projLat, lon: projLon } = targetProjectLocation; // Changed to targetProjectLocation

      // Calculate the center point
      const centerLat = (userLat + projLat) / 2;
      const centerLon = (userLon + projLon) / 2;

      // Calculate the deltas to encompass both points
      const latDelta = Math.abs(userLat - projLat) * 1.5; // Use 1.5 for a bit of padding
      const lonDelta = Math.abs(userLon - projLon) * 1.5;

      const region = {
        latitude: centerLat,
        longitude: centerLon,
        latitudeDelta: Math.max(latDelta, 0.005), // Use an even smaller minimum delta for closer zoom
        longitudeDelta: Math.max(lonDelta, 0.005),
      };
      setMapRegion(region);

    } else if (workerMapLocation) {
      // If only worker location is available, center on worker
      setMapRegion({
        latitude: workerMapLocation.latitude,
        longitude: workerMapLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    } else if (targetProjectLocation) { // Changed to targetProjectLocation
      // If only project location is available
      setMapRegion({
        latitude: targetProjectLocation.lat, // Changed to targetProjectLocation
        longitude: targetProjectLocation.lon, // Changed to targetProjectLocation
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  }, [workerMapLocation, targetProjectLocation]); // Changed to targetProjectLocation

  const handleSelectAssignment = (assignmentId: string) => {
    setSelectedNextAssignmentId(assignmentId);
    setIsAssignmentSelectionModalVisible(false);
  };
  
  const getStatusChipStyle = (status: AssignmentStatus) => {
    switch (status) {
        case 'active':
            return { backgroundColor: theme.statusColors.activeBackground, textColor: theme.statusColors.activeText };
        case 'completed':
            return { backgroundColor: theme.statusColors.completedBackground, textColor: theme.statusColors.completedText };
        case 'next':
            return { backgroundColor: theme.statusColors.successBackground, textColor: theme.statusColors.successText };
        case 'pending':
            return { backgroundColor: theme.statusColors.pendingBackground, textColor: theme.statusColors.pendingText };
        default:
            return { backgroundColor: theme.statusColors.neutralBackground, textColor: theme.statusColors.neutralText };
    }
  };

  const relevantAssignmentChipStyle = relevantAssignment ? getStatusChipStyle(relevantAssignment.status) : { backgroundColor: theme.statusColors.neutralBackground, textColor: theme.statusColors.neutralText };

  if (locationPermission === null) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.permissionText} fontType="regular">Checking location permissions...</Text>
      </View>
    );
  }

  if (locationPermission !== 'granted') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.permissionTitle} fontType="bold">Location Access Required</Text>
        <Text style={styles.permissionText} fontType="regular">
          This app needs your location to verify your position for check-in and to track your work session.
        </Text>
        <Button title="Grant Permission" onPress={requestPermissionAgain} style={styles.permissionButton} />
      </View>
    );
  }

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary} // iOS
              progressBackgroundColor={theme.colors.cardBackground} // Android
              colors={[theme.colors.primary]} // Android
            />
          }
        >
          {/* Card 1: Worker Status Card */}
          <Card style={styles.workerStatusCard}>
            <Text style={styles.workerStatusTitle} fontType="bold">
              {checkedIn ? "Work Session Active" : "Ready to Work?"}
            </Text>
            {checkedIn && sessionStartTime && (
              <Text style={styles.workerStatusSubtitle} fontType="regular">
                Checked in at: {new Date(sessionStartTime).toLocaleTimeString()}
              </Text>
            )}
            {/* Status Chip */}
            <View style={[styles.statusChipContainer, {
                backgroundColor: assignmentsLoading || !locationReady || !relevantAssignment
                    ? theme.statusColors.neutralBackground
                    : checkedIn
                    ? theme.statusColors.activeBackground
                    : isNearby
                    ? theme.statusColors.successBackground
                    : theme.statusColors.warningBackground,
            }]}>
                <Text style={[styles.statusChipText, {
                    color: assignmentsLoading || !locationReady || !relevantAssignment
                        ? theme.statusColors.neutralText
                        : checkedIn
                        ? theme.statusColors.activeText
                        : isNearby
                        ? theme.statusColors.successText
                        : theme.statusColors.warningText,
                }]} fontType="medium">
                    {assignmentsLoading
                    ? "Loading assignments..."
                    : !locationReady
                    ? "Fetching location..."
                    : !relevantAssignment
                    ? "No relevant assignment with location"
                    : checkedIn
                    ? "On Assignment"
                    : isNearby
                    ? "Ready to Check In"
                    : "Away from Assignment"}
                </Text>
            </View>
          </Card>

          {/* Single Assignment Card (Relevant Assignment) */}
          {assignmentsLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : !relevantAssignment ? (
            <Card style={styles.projectInfoCard}>
              <Text style={styles.projectInfoTitle} fontType="bold">No assignments for today.</Text>
              <Text style={styles.projectInfoAddress} fontType="regular">Check back later or contact your manager.</Text>
            </Card>
          ) : (
            <TouchableOpacity 
              onPress={() => setIsAssignmentSelectionModalVisible(true)} 
              disabled={isSelectionLocked}
              style={{ width: '100%' }}
            >
              <Card 
                style={[
                  styles.assignmentCard, 
                  relevantAssignment.status === 'active' ? styles.activeAssignmentCard : {},
                  relevantAssignment.status === 'next' ? styles.nextAssignmentCard : {},
                ]}
              >
                <View style={styles.assignmentHeader}>
                  <View style={[styles.assignmentColorIndicator, { backgroundColor: relevantAssignment.type === 'project' && relevantAssignment.project ? relevantAssignment.project.color : theme.colors.secondary }]} />
                  <Text style={styles.assignmentTitle} fontType="medium">
                    {relevantAssignment.type === 'project' ? (relevantAssignment.project?.name || 'Loading Project...') : (relevantAssignment.location?.name || 'Loading Location...')}
                  </Text>
                </View>
                {relevantAssignment.type === 'project' && relevantAssignment.project && (
                  <Text style={styles.assignmentSubtitle} fontType="regular">{relevantAssignment.project.address || ''}</Text>
                )}
                {relevantAssignment.start_time && (
                  <Text style={styles.assignmentTime} fontType="medium">Scheduled: {relevantAssignment.start_time}</Text>
                )}
                <View style={[styles.assignmentStatusChip, { backgroundColor: relevantAssignmentChipStyle.backgroundColor }]}>
                  <Text style={[styles.assignmentStatusText, { color: relevantAssignmentChipStyle.textColor }]} fontType="bold">{relevantAssignment.status.toUpperCase()}</Text>
                </View>
                {!isSelectionLocked && (
                    <View style={styles.selectAssignmentIcon}>
                        <Ionicons name="chevron-forward" size={theme.fontSizes.lg} color={theme.colors.bodyText} />
                    </View>
                )}
              </Card>
            </TouchableOpacity>
          )}
          
          {/* Card 3: Circle Timer / Map Card */}
          <Card style={styles.circleCard}>
            <Text style={styles.circleCardTitle} fontType="bold">
              {checkedIn ? "Timer Running" : relevantAssignment ? "Your Current Assignment Location" : "No Assignment Location"}
            </Text>
            <View style={styles.timerContainer}>
              {checkedIn ? (
                <CircularTimer elapsedTime={elapsedTime} size={220} strokeWidth={15} />
              ) : (
                <View style={styles.mapCircleWrapper}>
                  {locationReady && workerMapLocation && targetProjectLocation ? (
                    <MapView
                      ref={mapRef}
                      style={styles.mapStyle}
                      customMapStyle={[
                        { "featureType": "poi", "elementType": "labels", "stylers": [{ "visibility": "off" }] },
                        { "featureType": "transit", "elementType": "labels", "stylers": [{ "visibility": "off" }] }
                      ]}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      pitchEnabled={false}
                      rotateEnabled={false}
                      showsUserLocation={true}
                      showsMyLocationButton={false}
                      region={mapRegion}
                      onRegionChangeComplete={setMapRegion}
                    >
                      <Marker
                        coordinate={{ latitude: targetProjectLocation.lat, longitude: targetProjectLocation.lon }}
                        title={projectLocationName}
                        pinColor="black"
                      />
                      <Circle
                        center={{ latitude: targetProjectLocation.lat, longitude: targetProjectLocation.lon }}
                        radius={ACCEPTABLE_DISTANCE}
                        strokeWidth={2}
                        strokeColor={theme.colors.primary}
                        fillColor="rgba(84, 133, 226, 0.2)"
                      />
                    </MapView>
                  ) : (
                    <View style={styles.mapOverlayTextContainer}>
                      <ActivityIndicator size="large" color={theme.colors.primary} />
                      <Text style={styles.mapOverlayText} fontType="regular">
                        {relevantAssignment === null ? "No assignment with location for map" : "Fetching location and map..."}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            <Text style={styles.circleCardCaption} fontType="regular">
              {checkedIn ? "Tracking your work session." : locationStatusText}
            </Text>
          </Card>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: useBottomTabBarHeight() || theme.spacing(2) }]}>
          <Button
            title={buttonTitle}
            onPress={checkedIn ? handleCheckOut : handleCheckIn}
            style={checkedIn ? styles.checkOutButton : styles.checkInButton}
            textStyle={styles.buttonText}
            disabled={buttonDisabled || assignmentsLoading || !relevantAssignment}
          />
        </View>
      </View>
      <AssignmentSelectionModal
        isVisible={isAssignmentSelectionModalVisible}
        onClose={() => setIsAssignmentSelectionModalVisible(false)}
        assignments={currentWorkersAssignments.filter((assign: ProcessedAssignmentStepWithStatus) => assign.status !== 'active')}
        onSelectAssignment={handleSelectAssignment}
        currentSelectedId={selectedNextAssignmentId || relevantAssignment?.id || null}
      />
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // Use background color from theme
    paddingHorizontal: theme.spacing(2), // Consistent horizontal padding
  },
  centered: {
    flex: 1, // Take full space
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing(3),
  },
  permissionTitle: {
      fontSize: theme.fontSizes.xl, // Use theme font size
      color: theme.colors.headingText,
      textAlign: 'center',
      marginBottom: theme.spacing(2),
  },
  permissionText: {
      fontSize: theme.fontSizes.md, // Use theme font size
      color: theme.colors.bodyText,
      textAlign: 'center',
      marginBottom: theme.spacing(3),
  },
  permissionButton: {
      paddingVertical: theme.spacing(1.5),
      paddingHorizontal: theme.spacing(4),
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingVertical: theme.spacing(2), // Consistent vertical padding
    width: '100%',
  },
  workerStatusCard: {
    width: "100%",
    alignItems: "center",
    marginBottom: theme.spacing(2),
    borderRadius: theme.radius.xl, // Consistent border radius
    backgroundColor: theme.colors.cardBackground,
    paddingVertical: theme.spacing(4), // More vertical padding
    borderWidth: 1, // Add border
    borderColor: theme.colors.borderColor, // Consistent border color
    // Remove shadows/elevation for flat design
    ...Platform.select({
      web: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
      native: {
        elevation: 0,
      },
    }),
  },
  workerStatusTitle: {
    fontSize: theme.fontSizes.xl, // Use theme font size
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
  },
  workerStatusSubtitle: {
    fontSize: theme.fontSizes.md, // Use theme font size
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(2),
  },
  statusChipContainer: {
    paddingVertical: theme.spacing(1),
    paddingHorizontal: theme.spacing(2),
    borderRadius: theme.radius.pill,
    marginTop: theme.spacing(1),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipText: {
    fontSize: theme.fontSizes.sm, // Use theme font size
    fontWeight: '600',
  },
  projectInfoCard: {
    width: "100%",
    alignItems: "center",
    marginBottom: theme.spacing(2),
    borderRadius: theme.radius.xl, // Consistent border radius
    backgroundColor: theme.colors.cardBackground,
    paddingVertical: theme.spacing(4), // More vertical padding
    borderWidth: 1, // Add border
    borderColor: theme.colors.borderColor, // Consistent border color
    // Remove shadows/elevation for flat design
    ...Platform.select({
      web: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
      native: {
        elevation: 0,
      },
    }),
  },
  projectInfoTitle: {
    fontSize: theme.fontSizes.lg, // Use theme font size
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
  },
  projectInfoAddress: {
    fontSize: theme.fontSizes.md, // Use theme font size
    color: theme.colors.bodyText,
    textAlign: 'center',
  },
  circleCard: {
    width: "100%",
    alignItems: "center",
    marginBottom: theme.spacing(3),
    borderRadius: theme.radius.xl, // Consistent border radius
    backgroundColor: theme.colors.cardBackground,
    paddingTop: theme.spacing(4), // More vertical padding
    paddingBottom: theme.spacing(4), // More vertical padding
    borderWidth: 1, // Add border
    borderColor: theme.colors.borderColor, // Consistent border color
    // Remove shadows/elevation for flat design
    ...Platform.select({
      web: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
      native: {
        elevation: 0,
      },
    }),
  },
  circleCardTitle: {
    fontSize: theme.fontSizes.lg, // Use theme font size
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
  },
  circleCardCaption: {
    fontSize: theme.fontSizes.md, // Use theme font size
    color: theme.colors.bodyText,
    marginTop: theme.spacing(2),
    textAlign: 'center',
  },
  timerContainer: {
    marginVertical: theme.spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCircleWrapper: {
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 15,
    borderColor: theme.colors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapStyle: {
    width: '100%',
    height: '100%',
  },
  mapOverlayTextContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 110,
  },
  mapOverlayText: {
    fontSize: theme.fontSizes.md, // Use theme font size
    color: theme.colors.bodyText,
    marginTop: theme.spacing(1),
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: theme.spacing(2), // Consistent horizontal padding
    paddingVertical: theme.spacing(2),
    backgroundColor: theme.colors.background, // Use background color from theme
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
    width: '100%',
  },
  checkInButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing(2), // Use theme spacing
  },
  checkOutButton: {
    backgroundColor: theme.colors.warning, // Use theme color for warning
    paddingVertical: theme.spacing(2), // Use theme spacing
  },
  buttonText: {
    color: "white",
    fontSize: theme.fontSizes.lg, // Use theme font size
    fontWeight: "bold",
  },
  loadingIndicator: {
    marginVertical: theme.spacing(4),
  },
  assignmentCard: {
    width: "100%",
    marginBottom: theme.spacing(2),
    borderRadius: theme.radius.xl, // Consistent border radius
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing(3), // Consistent padding
    borderWidth: 1, // Add border
    borderColor: theme.colors.borderColor, // Consistent border color
    // Remove shadows/elevation for flat design
    ...Platform.select({
      web: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
      native: {
        elevation: 0,
      },
    }),
  },
  activeAssignmentCard: {
    borderColor: theme.statusColors.activeText,
    borderWidth: 2, // Keep a stronger border for active state
  },
  completedAssignmentCard: {
    opacity: 0.6,
    backgroundColor: theme.statusColors.neutralBackground,
  },
  nextAssignmentCard: {
    borderColor: theme.statusColors.successText,
    borderWidth: 2, // Keep a stronger border for next state
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  assignmentColorIndicator: {
    width: 8,
    height: 20,
    borderRadius: theme.radius.sm,
    marginRight: theme.spacing(1),
  },
  assignmentTitle: {
    fontSize: theme.fontSizes.lg, // Use theme font size
    fontWeight: "600",
    color: theme.colors.headingText,
  },
  assignmentSubtitle: {
    fontSize: theme.fontSizes.md, // Use theme font size
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(0.5),
  },
  assignmentTime: {
    fontSize: theme.fontSizes.md, // Use theme font size
    fontWeight: '500',
    color: theme.colors.primary,
  },
  assignmentStatusChip: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing(1),
    paddingVertical: theme.spacing(0.5),
  },
  assignmentStatusText: {
    fontSize: theme.fontSizes.sm, // Use theme font size
    fontWeight: 'bold',
  },
  selectAssignmentIcon: {
    position: 'absolute',
    right: theme.spacing(2),
    top: '50%',
    transform: [{ translateY: -12 }], // Center vertically
  },
});