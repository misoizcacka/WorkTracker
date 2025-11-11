import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Alert, ScrollView } from "react-native";
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { getDistance } from "geolib";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { CircularTimer } from "../../../components/CircularTimer";
import AnimatedScreen from "../../../components/AnimatedScreen";
import { theme } from "../../../theme";

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

  const ACCEPTABLE_DISTANCE = 150; // meters

  // Hardcoded project location for now
  const projectLocation = {
    lat: 52.4583613,
    lon: 13.5360227,
  };

  // ⏱ Track elapsed time
  useEffect(() => {
    let timer: NodeJS.Timeout;
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

  return (
    <AnimatedScreen>
      <View style={[styles.container, { paddingBottom: tabBarHeight }]}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <Card style={styles.mainCard}>
            <Text style={styles.cardTitle}>
              {checkedIn ? "Work Session" : "Ready to Work?"}
            </Text>
            
            {checkedIn && startTime && (
              <Text style={styles.checkInTimeText}>
                Checked in at: {new Date(startTime).toLocaleTimeString()}
              </Text>
            )}

            <View style={styles.timerContainer}>
              {checkedIn ? (
                <CircularTimer elapsedTime={elapsedTime} size={220} strokeWidth={15} />
              ) : (
                <View style={styles.notCheckedInContainer}>
                  <Text style={styles.notCheckedInText}>Not Checked In</Text>
                </View>
              )}
            </View>
            
            <Text
              style={[
                styles.distanceText,
                {
                  color:
                    !locationReady
                      ? theme.colors.textLight
                      : isNearby
                      ? theme.colors.success
                      : theme.colors.danger,
                },
              ]}
            >
              {!locationReady
                ? "Fetching location..."
                : isNearby
                ? "📍 You're at the work site"
                : `📏 You're ${Math.round(distance ?? 0)}m away`}
            </Text>
          </Card>
        </ScrollView>
        <View style={styles.footer}>
          <Button
            title={checkedIn ? "Check Out" : "Check In"}
            onPress={checkedIn ? handleCheckOut : handleCheckIn}
            style={checkedIn ? styles.dangerButton : styles.primaryButton}
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
    backgroundColor: theme.colors.background,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing(2),
  },
  mainCard: {
    width: "100%",
    alignItems: "center",
    padding: theme.spacing(3),
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing(1),
  },
  checkInTimeText: {
    fontSize: 16,
    color: theme.colors.textLight,
    marginBottom: theme.spacing(3),
  },
  timerContainer: {
    marginVertical: theme.spacing(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  notCheckedInContainer: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: theme.colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 15,
    borderColor: theme.colors.border,
  },
  notCheckedInText: {
    fontSize: 22,
    fontWeight: "600",
    color: theme.colors.textLight,
  },
  distanceText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginTop: theme.spacing(3),
  },
  footer: {
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
  },
  dangerButton: {
    backgroundColor: theme.colors.danger,
    paddingVertical: 15,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});

