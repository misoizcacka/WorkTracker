import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Alert, ScrollView, ActivityIndicator } from "react-native";
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
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

// ✅ Configure notifications (no deprecated fields)
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function WorkerHomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [distance, setDistance] = useState<number | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [outOfRange, setOutOfRange] = useState(false);
  const notificationSentRef = useRef(false); // ✅ prevent duplicate notifications
  const [workerMapLocation, setWorkerMapLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<React.ElementRef<typeof MapView>>(null);

  const { user } = useSession()!;
  const { processedAssignments, loadAssignmentsForDate, loadWorkSessionsForDate, isLoading: assignmentsLoading, activeWorkSession, startWorkSession, endWorkSession, updateWorkSessionAssignment } = useAssignments();

  const ACCEPTABLE_DISTANCE = 150; // meters

  // Derive checkedIn and sessionStartTime from activeWorkSession
  const checkedIn = !!activeWorkSession;
  const sessionStartTime = activeWorkSession ? new Date(activeWorkSession.start_time).getTime() : null;

  const currentWorkersAssignments = useMemo(() => {
    return user?.id ? processedAssignments[user.id] || [] : [];
  }, [user?.id, processedAssignments]);


  // Logic to find the *current* assignment being worked on (if any) and the *next* possible assignment
  const { currentActiveAssignment, nextAssignableAssignment, nextAssignmentsInSequence, currentAssignmentIndex } = useMemo(() => {
    let currentActive: ProcessedAssignmentStepWithStatus | null = null;
    let nextAssignable: ProcessedAssignmentStepWithStatus | null = null;
    let nextAssignments: ProcessedAssignmentStepWithStatus[] = [];
    let currentIdx = -1;

    if (!user?.id || currentWorkersAssignments.length === 0) {
      return { currentActiveAssignment: null, nextAssignableAssignment: null, nextAssignmentsInSequence: [], currentAssignmentIndex: -1 };
    }

    currentActive = currentWorkersAssignments.find(assign => assign.status === 'active') || null;
    nextAssignable = currentWorkersAssignments.find(assign => assign.status === 'next') || null;

    if (currentActive) {
      currentIdx = currentWorkersAssignments.indexOf(currentActive);
      nextAssignments = currentWorkersAssignments.filter(
        (assign, index) => index > currentIdx && (assign.status === 'next' || assign.status === 'pending')
      );
    } else if (nextAssignable) {
      currentIdx = currentWorkersAssignments.indexOf(nextAssignable);
      nextAssignments = currentWorkersAssignments.filter(
        (assign, index) => index > currentIdx && assign.status === 'pending'
      );
    } else {
      currentIdx = -1;
      nextAssignments = []; // No active or next, so no further "next" assignments
    }

    return { currentActiveAssignment: currentActive, nextAssignableAssignment: nextAssignable, nextAssignmentsInSequence: nextAssignments, currentAssignmentIndex: currentIdx };
  }, [user?.id, currentWorkersAssignments]);

  // The project location for geofencing is always the *current active* one if checked in,
  // or the *next assignable* one if not checked in.
  const targetAssignmentForGeofence = currentActiveAssignment || nextAssignableAssignment;

  const projectLocation = targetAssignmentForGeofence?.type === 'project' && targetAssignmentForGeofence.project
    ? { lat: targetAssignmentForGeofence.project.location.latitude, lon: targetAssignmentForGeofence.project.location.longitude }
    : targetAssignmentForGeofence?.type === 'common_location' && targetAssignmentForGeofence.location
    ? { lat: targetAssignmentForGeofence.location.latitude ?? 0, lon: targetAssignmentForGeofence.location.longitude ?? 0 }
    : null;

  const projectLocationName = targetAssignmentForGeofence?.type === 'project' && targetAssignmentForGeofence.project
    ? targetAssignmentForGeofence.project.name
    : targetAssignmentForGeofence?.type === 'common_location' && targetAssignmentForGeofence.location
    ? targetAssignmentForGeofence.location.name
    : "Project Site";

  const projectLocationAddress = targetAssignmentForGeofence?.type === 'project' && targetAssignmentForGeofence.project
    ? targetAssignmentForGeofence.project.address
    : "";

  // Fetch assignments and work sessions for the worker for today
  useEffect(() => {
    if (user?.id) {
      const today = moment().format('YYYY-MM-DD');
      loadAssignmentsForDate(today, [user.id]);
      loadWorkSessionsForDate(today, user.id); // Load work sessions as well
    }
  }, [user?.id, loadAssignmentsForDate, loadWorkSessionsForDate]);

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

  // 📍 Watch location & trigger notifications and transitions
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Location access is needed to check in.");
        return;
      }

      const { status: notifStatus } = await Notifications.requestPermissionsAsync();
      if (notifStatus !== "granted") {
        Alert.alert("Permission required", "Notification access is needed for alerts.");
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 3000,
          distanceInterval: 1,
        },
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setWorkerMapLocation({ latitude, longitude });

          let d: number | null = null;
          if (projectLocation) {
            d = getDistance(
              { latitude, longitude },
              { latitude: projectLocation.lat, longitude: projectLocation.lon }
            );
          }
          setDistance(d);
          setLocationReady(true);

          if (!projectLocation || !user?.id) return; // Cannot check geofence if no project location or user

          // --- Automatic Transition Logic (if checked in) ---
          if (checkedIn && activeWorkSession && currentActiveAssignment && workerMapLocation) {
            // 1. Check if worker exited current geofence
            if (d !== null && d > ACCEPTABLE_DISTANCE) {
              if (!outOfRange) { // Prevent duplicate exit events
                setOutOfRange(true);
                saveLocalTransitionEvent({
                  timestamp: new Date().toISOString(),
                  type: 'exit_geofence',
                  assignmentId: currentActiveAssignment.id,
                  workerId: user.id,
                  location: workerMapLocation,
                  notes: `Exited geofence for ${currentActiveAssignment.type === 'project' ? currentActiveAssignment.project?.name : currentActiveAssignment.location?.name}`,
                });
              }
              if (!notificationSentRef.current) { // Prevent duplicate notifications
                notificationSentRef.current = true;
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: "⚠️ You left the work site!",
                    body: `Please return to ${projectLocationName} or proceed to your next assignment.`,
                    sound: true,
                  },
                  trigger: null,
                });
              }
            } else { // Worker is back in range for current assignment
              if (outOfRange) { // Reset if was out of range
                setOutOfRange(false);
                notificationSentRef.current = false;
              }
            }

            // 2. Check if worker entered next project's geofence
            // Find the *first* 'next' assignment in the sequence after the current active one
            const nextTransitionTarget = currentWorkersAssignments.find(
              (assign, index) => index > currentAssignmentIndex && assign.status === 'next'
            );

            if (nextTransitionTarget) {
                const nextAssignmentLocation = nextTransitionTarget.type === 'project' && nextTransitionTarget.project
                  ? { lat: nextTransitionTarget.project.location.latitude, lon: nextTransitionTarget.project.location.longitude }
                  : nextTransitionTarget.type === 'common_location' && nextTransitionTarget.location
                  ? { lat: nextTransitionTarget.location.latitude ?? 0, lon: nextTransitionTarget.location.longitude ?? 0 }
                  : null;

                if (nextAssignmentLocation) {
                  const distToNext = getDistance(
                    { latitude, longitude },
                    { latitude: nextAssignmentLocation.lat, longitude: nextAssignmentLocation.lon }
                  );

                  if (distToNext <= ACCEPTABLE_DISTANCE) {
                    // Trigger automatic transition
                    try {
                      await updateWorkSessionAssignment(activeWorkSession.id, nextTransitionTarget.id);
                      saveLocalTransitionEvent({
                        timestamp: new Date().toISOString(),
                        type: 'enter_geofence',
                        assignmentId: nextTransitionTarget.id,
                        workerId: user.id,
                        location: workerMapLocation,
                        notes: `Entered geofence for ${nextTransitionTarget.type === 'project' ? nextTransitionTarget.project?.name : nextTransitionTarget.location?.name}`,
                      });
                      Alert.alert("Assignment Transitioned", `Automatically moved to ${nextTransitionTarget.type === 'project' ? nextTransitionTarget.project?.name : nextTransitionTarget.location?.name}.`);
                    } catch (transitionError: any) {
                      console.error("Failed to transition assignment:", transitionError);
                      Alert.alert("Transition Failed", transitionError.message || "Could not transition to the next assignment.");
                    }
                  }
                }
            }
          }
        }
      );

      return () => subscription.remove();
    })();
  }, [checkedIn, outOfRange, projectLocation, projectLocationName, user?.id, activeWorkSession, currentActiveAssignment, currentWorkersAssignments, currentAssignmentIndex, updateWorkSessionAssignment]);

  // ⏰ Check in/out logic
  const handleCheckIn = async () => {
    if (checkedIn) {
      Alert.alert("Already Checked In", `You are already checked into ${projectLocationName}.`);
      return;
    }
    if (!nextAssignableAssignment) {
      Alert.alert("No Assignment", "No assignments available for check-in today.");
      return;
    }
    if (!projectLocation) { // projectLocation is derived from nextAssignableAssignment here
      Alert.alert("Location Missing", `Assignment ${projectLocationName} has no valid location. Cannot check in.`);
      return;
    }
    if (distance === null || distance > ACCEPTABLE_DISTANCE) {
      Alert.alert("Too far", `You must be at ${projectLocationName} to check in.`);
      return;
    }

    try {
      await startWorkSession(nextAssignableAssignment.id);
      Toast.show({
        type: 'success',
        text1: 'Checked In',
        text2: `You are now working on ${projectLocationName}.`
      });
    } catch (err: any) {
      Alert.alert("Check-in Failed", err.message || "An error occurred during check-in.");
    }
  };

  const handleCheckOut = async () => {
    if (!activeWorkSession) {
      Alert.alert("Not Checked In", "You are not currently checked in.");
      return;
    }
    try {
      await endWorkSession(activeWorkSession.id);
      Toast.show({
        type: 'info',
        text1: 'Checked Out',
        text2: `You have successfully checked out from ${projectLocationName}.`
      });
      setElapsedTime(0); // Reset timer
      notificationSentRef.current = false; // Reset notification lock
      setOutOfRange(false); // Reset out of range status
    } catch (err: any) {
      Alert.alert("Check-out Failed", err.message || "An error occurred during check-out.");
    }
  };

  const isNearby = distance !== null && distance < ACCEPTABLE_DISTANCE;

  // Determine button state and text
  const buttonDisabled = assignmentsLoading || (checkedIn ? false : (!isNearby || !nextAssignableAssignment || !projectLocation));
  const buttonTitle = checkedIn ? "Check Out" : (nextAssignableAssignment ? "Check In" : "No Next Assignment");


  useEffect(() => {
    if (mapRef.current && workerMapLocation && distance !== null && projectLocation) {
      if (distance <= ACCEPTABLE_DISTANCE) {
        mapRef.current.animateToRegion({
          latitude: projectLocation.lat,
          longitude: projectLocation.lon,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        }, 300);
      } else {
        const coordinates = [
          { latitude: projectLocation.lat, longitude: projectLocation.lon },
          workerMapLocation,
        ];
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    }
  }, [workerMapLocation, projectLocation?.lat, projectLocation?.lon, distance]);

  const getStatusChipStyle = (status: AssignmentStatus) => {
    switch (status) {
      case 'active': return { backgroundColor: theme.statusColors.activeBackground, textColor: theme.statusColors.activeText };
      case 'next': return { backgroundColor: theme.statusColors.successBackground, textColor: theme.statusColors.successText };
      case 'completed': return { backgroundColor: theme.statusColors.neutralBackground, textColor: theme.statusColors.neutralText };
      case 'pending': return { backgroundColor: theme.statusColors.warningBackground, textColor: theme.statusColors.warningText };
      default: return { backgroundColor: theme.statusColors.neutralBackground, textColor: theme.statusColors.neutralText };
    }
  };

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
                    {/* Card 1: Worker Status Card */}
                    <Card style={styles.workerStatusCard}>
                      <Text style={styles.workerStatusTitle}>
                        {checkedIn ? "Work Session Active" : "Ready to Work?"}
                      </Text>
                      {checkedIn && sessionStartTime && (
                        <Text style={styles.workerStatusSubtitle}>
                          Checked in at: {new Date(sessionStartTime).toLocaleTimeString()}
                        </Text>
                      )}
                      {/* Status Chip */}
                      <View style={[styles.statusChipContainer, {
                          backgroundColor: !locationReady || !targetAssignmentForGeofence || assignmentsLoading
                              ? theme.statusColors.neutralBackground
                              : isNearby
                              ? theme.statusColors.successBackground
                              : theme.statusColors.warningBackground,
                      }]}>
                          <Text style={[styles.statusChipText, {
                              color: !locationReady || !targetAssignmentForGeofence || assignmentsLoading
                                  ? theme.statusColors.neutralText
                                  : isNearby
                                  ? theme.statusColors.successText
                                  : theme.statusColors.warningText,
                          }]}>
                              {assignmentsLoading
                              ? "Loading assignments..."
                              : !locationReady
                              ? "Fetching location..."
                              : !targetAssignmentForGeofence
                              ? "No relevant assignment with location"
                              : isNearby
                              ? `At the work site: ${projectLocationName}`
                              : `📏 ${Math.round(distance ?? 0)}m away from ${projectLocationName}`}
                          </Text>
                      </View>
                    </Card>

                    {/* Assignments List */}
                    {assignmentsLoading && currentWorkersAssignments.length === 0 ? (
                      <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loadingIndicator} />
                    ) : (
                      <>
                        {currentWorkersAssignments.length === 0 ? (
                          <Card style={styles.projectInfoCard}>
                            <Text style={styles.projectInfoTitle}>No assignments for today.</Text>
                            <Text style={styles.projectInfoAddress}>Check back later or contact your manager.</Text>
                          </Card>
                        ) : (
                          <>
                            {currentWorkersAssignments.map((assignment, index) => {
                              const chipStyle = getStatusChipStyle(assignment.status);
                              return (
                              <Card 
                                key={assignment.id} 
                                style={[
                                  styles.assignmentCard, 
                                  assignment.status === 'active' ? styles.activeAssignmentCard : {},
                                  assignment.status === 'completed' ? styles.completedAssignmentCard : {},
                                  assignment.status === 'next' ? styles.nextAssignmentCard : {},
                                ]}
                              >
                                <View style={styles.assignmentHeader}>
                                  <View style={[styles.assignmentColorIndicator, { backgroundColor: assignment.type === 'project' && assignment.project ? assignment.project.color : theme.colors.secondary }]} />
                                  <Text style={styles.assignmentTitle}>{assignment.type === 'project' ? (assignment.project?.name || 'Loading Project...') : (assignment.location?.name || 'Loading Location...')}</Text>
                                </View>
                                {assignment.type === 'project' && assignment.project && (
                                  <Text style={styles.assignmentSubtitle}>{assignment.project.address || ''}</Text>
                                )}
                                {assignment.start_time && (
                                  <Text style={styles.assignmentTime}>Scheduled: {assignment.start_time}</Text>
                                )}
                                {/* Status Indicator */}
                                <View style={[styles.assignmentStatusChip, { backgroundColor: chipStyle.backgroundColor }]}>
                                  <Text style={[styles.assignmentStatusText, { color: chipStyle.textColor }]}>{assignment.status.toUpperCase()}</Text>
                                </View>
                              </Card>
                            )})}
                          </>
                        )}
                      </>
                    )}
          
                    {/* Card 3: Circle Timer / Map Card */}
                    <Card style={styles.circleCard}>
                      <Text style={styles.circleCardTitle}>
                        {checkedIn ? "Timer Running" : targetAssignmentForGeofence ? "Your Current Assignment Location" : "No Assignment Location"}
                      </Text>
                      <View style={styles.timerContainer}>
                        {checkedIn ? (
                          <CircularTimer elapsedTime={elapsedTime} size={220} strokeWidth={15} />
                        ) : (
                          <View style={styles.mapCircleWrapper}>
                            {locationReady && workerMapLocation && targetAssignmentForGeofence && projectLocation ? (
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
                              >
                                <Marker
                                  coordinate={{ latitude: projectLocation.lat, longitude: projectLocation.lon }}
                                  title={projectLocationName}
                                  pinColor={theme.colors.primary}
                                />
                                <Circle
                                  center={{ latitude: projectLocation.lat, longitude: projectLocation.lon }}
                                  radius={ACCEPTABLE_DISTANCE}
                                  strokeWidth={2}
                                  strokeColor={theme.colors.primary}
                                  fillColor="rgba(84, 133, 226, 0.2)"
                                />
                              </MapView>
                            ) : (
                              <View style={styles.mapOverlayTextContainer}>
                                <ActivityIndicator size="large" color={theme.colors.primary} />
                                <Text style={styles.mapOverlayText}>
                                  {targetAssignmentForGeofence === null ? "No assignment with location for map" : "Fetching location and map..."}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                      <Text style={styles.circleCardCaption}>
                        {checkedIn ? "Tracking your work session." : targetAssignmentForGeofence ? `Geofence for ${projectLocationName}.` : "No assignment with location to track."}
                      </Text>
                    </Card>
                  </ScrollView>
                  <View style={[styles.footer, { paddingBottom: theme.spacing(2) }]}>
                    <Button
                      title={buttonTitle}
                      onPress={checkedIn ? handleCheckOut : handleCheckIn}
                      style={checkedIn ? styles.checkOutButton : styles.checkInButton}
                      textStyle={styles.buttonText}
                      disabled={buttonDisabled || assignmentsLoading}
                    />
                  </View>
                </View>
              </AnimatedScreen>
            );
          }
          
          const styles = StyleSheet.create({
            container: {
              flex: 1,
              backgroundColor: theme.colors.pageBackground,
            },
            scrollViewContent: {
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: theme.spacing(2),
              width: '100%',
            },
            workerStatusCard: {
              width: "100%",
              alignItems: "center",
              marginBottom: theme.spacing(2),
              paddingVertical: theme.spacing(3),
            },
            workerStatusTitle: {
              fontSize: 26,
              fontWeight: "bold",
              color: theme.colors.headingText,
              marginBottom: theme.spacing(0.5),
            },
            workerStatusSubtitle: {
              fontSize: 16,
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
              fontSize: 15,
              fontWeight: '600',
            },
            projectInfoCard: {
              width: "100%",
              alignItems: "center",
              marginBottom: theme.spacing(2),
              paddingVertical: theme.spacing(3),
            },
            projectInfoTitle: {
              fontSize: 20,
              fontWeight: "bold",
              color: theme.colors.headingText,
              marginBottom: theme.spacing(1),
            },
            projectInfoAddress: {
              fontSize: 16,
              color: theme.colors.bodyText,
              textAlign: 'center',
            },
            circleCard: {
              width: "100%",
              alignItems: "center",
              marginBottom: theme.spacing(3),
              paddingTop: theme.spacing(3),
              paddingBottom: theme.spacing(3),
            },
            circleCardTitle: {
              fontSize: 20,
              fontWeight: "bold",
              color: theme.colors.headingText,
              marginBottom: theme.spacing(2),
            },
            circleCardCaption: {
              fontSize: 15,
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
              fontSize: 16,
              color: theme.colors.bodyText,
              marginTop: theme.spacing(1),
              textAlign: 'center',
            },
            footer: {
              paddingHorizontal: theme.spacing(3),
              paddingVertical: theme.spacing(2),
              backgroundColor: theme.colors.pageBackground,
              borderTopWidth: 1,
              borderTopColor: theme.colors.borderColor,
              width: '100%',
            },
            checkInButton: {
              backgroundColor: theme.colors.primary,
              paddingVertical: 15,
            },
            checkOutButton: {
              backgroundColor: "#F59E0B",
              paddingVertical: 15,
            },
            buttonText: {
              color: "white",
              fontSize: 18,
              fontWeight: "bold",
            },
            loadingIndicator: {
              marginVertical: theme.spacing(4),
            },
            assignmentCard: {
              width: "100%",
              marginBottom: theme.spacing(2),
              padding: theme.spacing(2),
            },
            activeAssignmentCard: {
              borderColor: theme.statusColors.activeText,
              borderWidth: 2,
            },
            completedAssignmentCard: {
              opacity: 0.6,
              backgroundColor: theme.statusColors.neutralBackground,
            },
            nextAssignmentCard: {
              borderColor: theme.statusColors.successText,
              borderWidth: 2,
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
              fontSize: 18,
              fontWeight: "600",
              color: theme.colors.headingText,
            },
            assignmentSubtitle: {
              fontSize: 14,
              color: theme.colors.bodyText,
              marginBottom: theme.spacing(0.5),
            },
            assignmentTime: {
              fontSize: 14,
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
              fontSize: 12,
              fontWeight: 'bold',
            }
          });