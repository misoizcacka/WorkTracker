import React, { useState, useEffect, useRef } from "react";
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
  const [checkedIn, setCheckedIn] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [distance, setDistance] = useState<number | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [outOfRange, setOutOfRange] = useState(false);
  const notificationSentRef = useRef(false); // ✅ prevent duplicate notifications
  const [workerMapLocation, setWorkerMapLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<React.ElementRef<typeof MapView>>(null);

  const ACCEPTABLE_DISTANCE = 150; // meters

  // Hardcoded project location for now
  const projectLocation = {
    lat: 52.4583613,
    lon: 13.5360227,
  };

  // ⏱ Track elapsed time
  useEffect(() => {
    let timer: number;
    if (checkedIn && startTime) {
      timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [checkedIn, startTime]);

  // 📍 Watch location & trigger notifications once per state change
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
          const d = getDistance(
            { latitude, longitude },
            { latitude: projectLocation.lat, longitude: projectLocation.lon }
          );
          setDistance(d);
          setLocationReady(true);

          if (!checkedIn) return;

          if (d > ACCEPTABLE_DISTANCE) {
            if (!outOfRange) {
              setOutOfRange(true);
            }
            if (!notificationSentRef.current) {
              notificationSentRef.current = true; // lock
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "⚠️ You left the work site!",
                  body: "Please return to your assigned location to remain checked in.",
                  sound: true,
                },
                trigger: null,
              });
            }
          } else {
            if (outOfRange) setOutOfRange(false);
            notificationSentRef.current = false; // reset lock
          }
        }
      );

      return () => subscription.remove();
    })();
  }, [checkedIn, outOfRange]);

  // ⏰ Check in/out logic
  const handleCheckIn = () => {
    if (distance !== null && distance > ACCEPTABLE_DISTANCE) {
      Alert.alert("Too far", "You must be at the work site to check in.");
      return;
    }
    setCheckedIn(true);
    setStartTime(Date.now());
    setOutOfRange(false);
  };

  const handleCheckOut = () => {
    setCheckedIn(false);
    setElapsedTime(0);
    setStartTime(null);
    setOutOfRange(false);
  };

  const isNearby = distance !== null && distance < ACCEPTABLE_DISTANCE;

  useEffect(() => {
    if (mapRef.current && !checkedIn && workerMapLocation && distance !== null) {
      if (distance <= ACCEPTABLE_DISTANCE) {
        // If worker is nearby, set a fixed, tight region centered on the project
        mapRef.current.animateToRegion({
          latitude: projectLocation.lat,
          longitude: projectLocation.lon,
          latitudeDelta: 0.002, // Very tight zoom around the project
          longitudeDelta: 0.002,
        }, 300); // Animate to the new region
      } else {
        // If worker is further away, fit to coordinates
        const coordinates = [
          { latitude: projectLocation.lat, longitude: projectLocation.lon },
          workerMapLocation,
        ];
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, // Use slightly larger padding for distinct points
          animated: true,
        });
      }
    }
  }, [workerMapLocation, checkedIn, projectLocation.lat, projectLocation.lon, distance]);

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
                    {/* Card 1: Worker Status Card */}
                    <Card style={styles.workerStatusCard}>
                      <Text style={styles.workerStatusTitle}>
                        {checkedIn ? "Work Session Active" : "Ready to Work?"}
                      </Text>
                      {checkedIn && startTime && (
                        <Text style={styles.workerStatusSubtitle}>
                          Checked in at: {new Date(startTime).toLocaleTimeString()}
                        </Text>
                      )}
                      {/* Status Chip will go here, replacing distanceText */}
                      <View style={[styles.statusChipContainer, { 
                          backgroundColor: !locationReady
                              ? theme.statusColors.neutralBackground
                              : isNearby
                              ? theme.statusColors.successBackground
                              : theme.statusColors.warningBackground,
                      }]}>
                          <Text style={[styles.statusChipText, { 
                              color: !locationReady
                                  ? theme.statusColors.neutralText
                                  : isNearby
                                  ? theme.statusColors.successText
                                  : theme.statusColors.warningText,
                          }]}>
                              {!locationReady
                              ? "Fetching location..."
                              : isNearby
                              ? "At the work site"
                              : `📏 ${Math.round(distance ?? 0)}m away`}
                          </Text>
                      </View>
                    </Card>
          
                    {/* Card 2: Project Information Card (only when not checked in) */}
                    {!checkedIn && (
                      <Card style={styles.projectInfoCard}>
                        <Text style={styles.projectInfoTitle}>Head to your first project</Text>
                        <Text style={styles.projectInfoAddress}>Scharnweberstrasse 23, 12459 Berlin</Text>
                      </Card>
                    )}
          
                    {/* Card 3: Circle Timer / Map Card */}
                    <Card style={styles.circleCard}>
                      <Text style={styles.circleCardTitle}>
                        {checkedIn ? "Timer Running" : "Your Project Location"}
                      </Text>
                      <View style={styles.timerContainer}>
                        {checkedIn ? (
                          <CircularTimer elapsedTime={elapsedTime} size={220} strokeWidth={15} />
                        ) : (
                          <View style={styles.mapCircleWrapper}>
                            {locationReady && workerMapLocation ? (
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
                                  title="Project Site"
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
                                <Text style={styles.mapOverlayText}>Fetching location and map...</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                      <Text style={styles.circleCardCaption}>
                        {checkedIn ? "Tracking your work session." : "Stay within the allowed zone to check in."}
                      </Text>
                    </Card>
                  </ScrollView>
                  <View style={styles.footer}>
                    <Button
                      title={checkedIn ? "Check Out" : "Check In"}
                      onPress={checkedIn ? handleCheckOut : handleCheckIn}
                      style={checkedIn ? styles.checkOutButton : styles.checkInButton}
                      textStyle={styles.buttonText}
                      disabled={!isNearby && !checkedIn}
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
              width: '100%', // Ensure scroll view content takes full width
            },
            // Card 1: Worker Status Card
            workerStatusCard: {
              width: "100%",
              alignItems: "center",
              marginBottom: theme.spacing(2),
              paddingVertical: theme.spacing(3), // More vertical padding
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
              borderRadius: theme.radius.pill, // Rounded corners for chip
              marginTop: theme.spacing(1),
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            },
            statusChipText: {
              fontSize: 15,
              fontWeight: '600',
            },
          
            // Card 2: Project Info Card
            projectInfoCard: {
              width: "100%",
              alignItems: "center",
              marginBottom: theme.spacing(2),
              paddingVertical: theme.spacing(3), // More vertical padding
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
          
            // Card 3: Circle Map / Timer Card
            circleCard: {
              width: "100%",
              alignItems: "center",
              marginBottom: theme.spacing(3), // More spacing before footer button
              paddingTop: theme.spacing(3), // Top padding for title
              paddingBottom: theme.spacing(3), // Bottom padding for caption
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
              marginVertical: theme.spacing(2), // Reduced margin to fit within card
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
            
            // Footer Button Styles
            footer: {
              paddingHorizontal: theme.spacing(3),
              paddingVertical: theme.spacing(2),
              backgroundColor: theme.colors.pageBackground,
              borderTopWidth: 1,
              borderTopColor: theme.colors.borderColor,
              width: '100%', // Ensure footer spans full width
            },
            checkInButton: {
              backgroundColor: theme.colors.primary,
              paddingVertical: 15,
            },
            checkOutButton: {
              backgroundColor: "#F59E0B", // Warm amber
              paddingVertical: 15,
            },
            buttonText: {
              color: "white",
              fontSize: 18,
              fontWeight: "bold",
            },
          });

