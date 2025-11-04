import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Alert, ScrollView, SafeAreaView } from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { getDistance } from "geolib";
import { Link } from "expo-router";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { CircularTimer } from "../../components/CircularTimer";
import { theme } from "../../theme";

// ✅ Configure notifications (no deprecated fields)
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface Project {
  name: string;
  address: string;
  lat: number;
  lon: number;
}

export default function WorkerHomeScreen() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [distance, setDistance] = useState<number | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [outOfRange, setOutOfRange] = useState(false);
  const notificationSentRef = useRef(false); // ✅ prevent duplicate notifications

  const project: Project = {
    name: "Office Renovation",
    address: "Scharnweberstraße 25, 12459 Berlin",
    lat: 52.4583613,
    lon: 13.5360227,
  };

  const ACCEPTABLE_DISTANCE = 150; // meters

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
            { latitude: project.lat, longitude: project.lon }
          );
          setDistance(d);
          setLocationReady(true);

          console.log("📍 Current:", latitude, longitude, "→", Math.round(d), "m");

          if (!checkedIn) return;

          // ✅ handle transition states cleanly
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
              console.log("🚨 Notification sent (once per leave)");
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
    if (!distance || distance > ACCEPTABLE_DISTANCE) {
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


  // 🧭 Distance text logic
  const distanceText =
    distance == null
      ? "Fetching location..."
      : distance < ACCEPTABLE_DISTANCE
      ? "📍 You're at the work site"
      : `📏 You're ${Math.round(distance)} m away from the site`;

  const isNearby = distance !== null && distance < ACCEPTABLE_DISTANCE;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Work Session</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.reminderText}>Make sure you check in before you start working.</Text>

        <Card style={{ width: "100%", marginBottom: theme.spacing(2) }}>
          <Text style={styles.projectName}>{project.name}</Text>
          <Text style={styles.projectAddress}>{project.address}</Text>
        </Card>

        <Card style={{ alignItems: "center", marginBottom: theme.spacing(2) }}>
          {checkedIn ? (
            <>
              <Text style={styles.timerLabel}>Time on site</Text>
              <CircularTimer elapsedTime={elapsedTime} size={200} strokeWidth={5} />
            </>
          ) : (
            <Text style={styles.timerLabel}>Not checked in</Text>
          )}
        </Card>

        <Card style={{ alignItems: "center", marginBottom: theme.spacing(2) }}>
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
            {distanceText}
          </Text>
        </Card>

        <Button
          title={checkedIn ? "Check Out" : "Check In"}
          onPress={checkedIn ? handleCheckOut : handleCheckIn}
          style={checkedIn ? styles.dangerButton : styles.blackButton}
          textStyle={styles.blackButtonText}
          disabled={!isNearby && !checkedIn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing(3),
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightBorder,
  },
  scrollViewContent: {
    padding: theme.spacing(3),
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing(3),
    textAlign: "center",
    paddingTop: theme.spacing(2),
  },
  reminderText: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: theme.spacing(2),
    textAlign: "center",
  },
  projectName: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
  },
  projectAddress: {
    fontSize: 16,
    color: theme.colors.textLight,
    marginTop: 4,
  },
  timerLabel: {
    fontSize: 18,
    color: theme.colors.textLight,
  },
  distanceText: {
    fontSize: 16,
    fontWeight: "600",
  },
  link: {
    color: theme.colors.primary,
    marginTop: theme.spacing(3),
    fontSize: 16,
    textDecorationLine: "underline",
  },
  blackButton: {
    backgroundColor: "black",
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(2),
  },
  blackButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "normal",
  },
  dangerButton: {
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(2),
  },
});
