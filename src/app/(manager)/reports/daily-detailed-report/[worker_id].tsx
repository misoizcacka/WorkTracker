import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, useWindowDimensions, Image } from 'react-native';
import Slider from '@react-native-community/slider'; // Import Slider
import { useLocalSearchParams } from 'expo-router';
import moment from 'moment';

import AnimatedScreen from '../../../../components/AnimatedScreen';
import { Card } from '../../../../components/Card';
import { theme } from '../../../../theme';
import { supabase } from '../../../../utils/supabase';
import { MapView } from '../../../../components/MapView';
import { Ionicons } from '@expo/vector-icons';
import { Region } from 'react-native-maps';
import { WorkerLocation } from '~/components/map-types';

interface DailyEvent {
  event_id: string;
  event_timestamp: string;
  event_type: 'enter_geofence' | 'exit_geofence';
  ref_name: string;
  latitude: number;
  longitude: number;
}

interface DailySummary {
  worker_full_name: string;
  worker_avatar_url: string | null;
  total_hours_worked: number;
  total_break_minutes: number;
  total_work_sessions: number;
  projects_worked_on: string[];
  approx_travelled_km: number;
  first_session_start_time: string | null;
  last_session_end_time_or_eod: string | null;
}

// Haversine formula to calculate distance between two lat/lon points
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const WorkerDailyDetail = () => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const { worker_id, date } = useLocalSearchParams<{ worker_id: string; date: string }>();
  
  const [events, setEvents] = useState<DailyEvent[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region | undefined>(undefined);
  const [selectedMapTime, setSelectedMapTime] = useState<number | null>(null); // Unix timestamp for slider
  const [temporarySelectedMapTime, setTemporarySelectedMapTime] = useState<number | null>(null); // Temporary state for slider during drag
  const [inferredLocation, setInferredLocation] = useState<DailyEvent | null>(null);
  const [sliderMinTime, setSliderMinTime] = useState<number | null>(null);
  const [sliderMaxTime, setSliderMaxTime] = useState<number | null>(null);
  const [mapWorker, setMapWorker] = useState<WorkerLocation[]>([]);
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (inferredLocation && dailySummary) {
      setMapWorker([{
        id: worker_id as string,
        name: dailySummary.worker_full_name,
        avatar: dailySummary.worker_avatar_url || undefined,
        location: {
          latitude: inferredLocation.latitude,
          longitude: inferredLocation.longitude,
        },
        lastSeen: inferredLocation.event_timestamp,
        type: 'worker',
      }]);
    } else {
      setMapWorker([]);
    }
  }, [inferredLocation, dailySummary, worker_id]);

  const calculateKilometers = useCallback((eventList: DailyEvent[]) => {
    let totalKm = 0;
    for (let i = 0; i < eventList.length - 1; i++) {
      const p1 = eventList[i];
      const p2 = eventList[i + 1];
      totalKm += haversineDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    }
    return parseFloat(totalKm.toFixed(2));
  }, []);

  useEffect(() => {
    if (!worker_id || !date) return;

    const fetchDetails = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_worker_daily_details', {
        worker_id_param: worker_id,
        report_date: date,
      });

      if (error) {
        console.error('Error fetching daily details:', error);
        setEvents([]);
      } else {
        setEvents(data || []);
        if (data && data.length > 0) {
            setMapRegion({
                latitude: data[0].latitude,
                longitude: data[0].longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            });
            // Update kilometers in summary after events are fetched
            setDailySummary(prev => (prev ? ({
                ...prev,
                approx_travelled_km: calculateKilometers(data),
            }) : null));
        }
      }
      setLoading(false);
    };

    const fetchSummary = async () => {
        setLoadingSummary(true);
        const { data, error } = await supabase.rpc('get_worker_daily_summary', {
            worker_id_param: worker_id,
            report_date: date,
        });

        if (error) {
            console.error('Error fetching daily summary:', error);
            setDailySummary(null);
        } else {
            if (data && data.length > 0) {
                const summaryData = { 
                    ...data[0], 
                    total_hours_worked: data[0].total_hours_worked || 0, 
                    total_break_minutes: data[0].total_break_minutes || 0,
                    total_work_sessions: data[0].total_work_sessions || 0, // Ensure it's a number
                    approx_travelled_km: 0 
                };
                setDailySummary(summaryData);
                // Removed setSelectedMapTime initialization from here. It will be handled in a separate useEffect.
            } else {
                setDailySummary(null);
            }
        }
        setLoadingSummary(false);
    };

    fetchDetails();
    fetchSummary();
  }, [worker_id, date, calculateKilometers]);

  // Effect to initialize selectedMapTime and map region when all data is loaded
  useEffect(() => {
    // Only proceed if dailySummary is available. Events are used as a secondary source for time range.
    if (!dailySummary || !date || (loading || loadingSummary)) {
      return;
    }

    let minTime: number;
    let maxTime: number;

    // Determine the effective minimum time for the slider range
    if (dailySummary.first_session_start_time) {
        minTime = moment(dailySummary.first_session_start_time).valueOf();
    } else if (events.length > 0) {
        // Fallback to earliest event if no session start time
        minTime = moment(events[0].event_timestamp).valueOf();
    } else {
        // Fallback to start of day
        minTime = moment(date).startOf('day').valueOf();
    }

    // Determine the effective maximum time for the slider range
    if (dailySummary.last_session_end_time_or_eod) {
        maxTime = moment(dailySummary.last_session_end_time_or_eod).valueOf();
    } else if (events.length > 0) {
        // Fallback to latest event if no session end time
        maxTime = moment(events[events.length - 1].event_timestamp).valueOf();
    } else {
        // Fallback to end of day
        maxTime = moment(date).endOf('day').valueOf();
    }

    if (selectedMapTime === null || selectedMapTime < minTime || selectedMapTime > maxTime) {
        setSelectedMapTime(minTime);
        setTemporarySelectedMapTime(minTime); // Initialize temporary value as well
    }

    // Initialize mapRegion to the first event's location if not already set,
    // and if there are events and inferredLocation is also available.
    // This ensures the map centers on an actual point.
    if (!mapRegion && events.length > 0 && inferredLocation) {
        setMapRegion({
            latitude: inferredLocation.latitude,
            longitude: inferredLocation.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
        });
        setMapZoom(12); // Initialize zoom to a reasonable city level
    }

    // Set slider bounds
    setSliderMinTime(minTime);
    setSliderMaxTime(maxTime);

  }, [dailySummary, events, date, loading, loadingSummary, selectedMapTime, mapRegion, inferredLocation, temporarySelectedMapTime]); // Add temporarySelectedMapTime to dependencies

  // Effect to update inferred location based on selectedMapTime and events
  useEffect(() => {
    if (selectedMapTime === null || events.length === 0) {
      setInferredLocation(null);
      return;
    }

    let foundEvent: DailyEvent | null = null;

    // Find the latest event that occurred at or before the selectedMapTime
    for (let i = events.length - 1; i >= 0; i--) { // Iterate backwards for efficiency
        const current = events[i];
        const currentTime = moment(current.event_timestamp).valueOf();
        if (currentTime <= selectedMapTime) {
            foundEvent = current;
            break;
        }
    }

    // If no event found at or before selectedMapTime, but events exist, use the very first event
    if (!foundEvent && events.length > 0) {
        foundEvent = events[0];
    }

    setInferredLocation(foundEvent);
    // console.log removed as per user request
  }, [selectedMapTime, events]); // This useEffect now only runs on final selectedMapTime update


  // New useEffect to update mapRegion when inferredLocation changes
  useEffect(() => {
    if (inferredLocation) {
      setMapRegion(prevRegion => ({
        latitude: inferredLocation.latitude,
        longitude: inferredLocation.longitude,
        latitudeDelta: prevRegion?.latitudeDelta || 0.0922,
        longitudeDelta: prevRegion?.longitudeDelta || 0.0421,
        zoom: mapZoom ?? 12, // Use existing mapZoom or default
      }));
    }
  }, [inferredLocation, mapZoom]);


  const renderEvent = (event: DailyEvent) => {
    const isEnter = event.event_type === 'enter_geofence';
    const eventDescription = isEnter
      ? `Worker started working on assignment: ${event.ref_name}`
      : `Worker stopped working on assignment: ${event.ref_name}`;
    
    return (
      <View key={event.event_id} style={styles.eventRow}>
        <View style={[styles.eventIcon, {backgroundColor: isEnter ? theme.colors.success : theme.colors.danger}]}>
            <Ionicons name={isEnter ? "arrow-down" : "arrow-up"} size={18} color="white" />
        </View>
        <View style={styles.eventDetails}>
            <Text style={styles.eventText}>
                {eventDescription}
            </Text>
            <Text style={styles.eventTime}>{moment(event.event_timestamp).format('YYYY-MM-DD HH:mm:ss')}</Text>
        </View>
      </View>
    );
  };

  const layoutStyle = isLargeScreen ? styles.largeScreenLayout : styles.smallScreenLayout;

  return (
    <AnimatedScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
        <Text style={styles.title}>Worker Daily Details</Text>
        {dailySummary && <Text style={styles.subTitle}>For {dailySummary.worker_full_name} on {moment(date).format('MMMM D, YYYY')}</Text>}
        
        {(loading || loadingSummary) ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{flex: 1, marginTop: 50}}/>
        ) : (
            <>
                {events.length === 0 && !dailySummary ? (
                    <Card style={{padding: 20, alignItems: 'center'}}><Text>No data found for this day.</Text></Card>
                ) : (
                    <View style={layoutStyle}>
                        {/* Left Column */}
                        <View style={styles.leftColumn}>
                            {dailySummary && (
                                <Card style={styles.summaryCard}>
                                    <View style={styles.workerHeader}>
                                        {dailySummary.worker_avatar_url ? (
                                            <Image source={{ uri: dailySummary.worker_avatar_url }} style={styles.workerAvatar} />
                                        ) : (
                                            <View style={[styles.workerAvatar, styles.workerAvatarPlaceholder]}>
                                                <Ionicons name="person" size={30} color={theme.colors.bodyText} />
                                            </View>
                                        )}
                                        <Text style={styles.workerName}>{dailySummary.worker_full_name}</Text>
                                    </View>
                                    <View style={styles.summaryGrid}>
                                        <View style={styles.summaryItem}>
                                            <Text style={styles.summaryLabel}>Work Sessions:</Text>
                                            <Text style={styles.summaryValue}>{dailySummary.total_work_sessions}</Text>
                                        </View>
                                        <View style={styles.summaryItem}>
                                            <Text style={styles.summaryLabel}>Hours Worked:</Text>
                                            <Text style={styles.summaryValue}>{dailySummary.total_hours_worked.toFixed(2)}h</Text>
                                        </View>
                                        <View style={styles.summaryItem}>
                                            <Text style={styles.summaryLabel}>Break Minutes:</Text>
                                            <Text style={styles.summaryValue}>{dailySummary.total_break_minutes}min</Text>
                                        </View>
                                        <View style={styles.summaryItem}>
                                            <Text style={styles.summaryLabel}>Projects:</Text>
                                            <Text style={styles.summaryValue}>{dailySummary.projects_worked_on.length > 0 ? dailySummary.projects_worked_on.join(', ') : 'N/A'}</Text>
                                        </View>
                                        <View style={styles.summaryItem}>
                                            <Text style={styles.summaryLabel}>Km Travelled:</Text>
                                            <Text style={styles.summaryValue}>{dailySummary.approx_travelled_km}km</Text>
                                        </View>
                                    </View>
                                </Card>
                            )}
                            <Card style={styles.timelineColumn}>
                                <Text style={styles.columnTitle}>Event Timeline</Text>
                                <ScrollView contentContainerStyle={styles.eventListContent}>
                                    {events.filter(event => event.event_type === 'enter_geofence' || event.event_type === 'exit_geofence').slice().reverse().map(event => renderEvent(event))}
                                </ScrollView>
                            </Card>
                        </View>
                        {/* Right Column */}
                        <View style={styles.rightColumn}>
                            <Card style={styles.mapCard}>
                                <View style={styles.mapViewContainer}>
                                    <MapView
                                        style={{ flex: 1 }}
                                        region={mapRegion}
                                        onRegionChangeComplete={(region) => setMapRegion(region)}
                                        selectedWorkers={mapWorker}
                                        zoom={mapZoom}
                                        onWebZoomChange={setMapZoom}
                                    >
                                    </MapView>
                                </View>
                                {dailySummary && sliderMinTime !== null && sliderMaxTime !== null && (
                                    <View style={styles.timelineSliderContainer}>
                                        <Text style={styles.timelineSliderLabel}>
                                            Time: {temporarySelectedMapTime ? moment(temporarySelectedMapTime).format('HH:mm:ss') : 'N/A'}
                                        </Text>
                                        <Slider
                                            style={styles.timelineSlider}
                                            minimumValue={sliderMinTime}
                                            maximumValue={sliderMaxTime}
                                            value={temporarySelectedMapTime || sliderMinTime} // Use temporary value
                                            onValueChange={setTemporarySelectedMapTime} // Update temporary value continuously
                                            onSlidingComplete={setSelectedMapTime} // Update final value on release
                                            minimumTrackTintColor={theme.colors.primary}
                                            maximumTrackTintColor={theme.colors.borderColor}
                                            thumbTintColor={theme.colors.primary}
                                        />
                                        <View style={styles.timeLabelsContainer}>
                                            <Text style={styles.timeLabel}>{moment(sliderMinTime).format('HH:mm')}</Text>
                                            <Text style={styles.timeLabel}>{moment(sliderMaxTime).format('HH:mm')}</Text>
                                        </View>
                                    </View>
                                )}
                            </Card>
                        </View>
                    </View>
                )}
            </>
        )}
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.pageBackground },
    scrollContentContainer: { padding: theme.spacing(3) },
    title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.headingText },
    subTitle: { fontSize: 18, color: theme.colors.bodyText, marginBottom: theme.spacing(3) },
    largeScreenLayout: { 
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    smallScreenLayout: { flexDirection: 'column' },
    leftColumn: {
        flex: 1,
        marginRight: theme.spacing(3),
    },
    rightColumn: {
        flex: 1.5,
    },
    timelineColumn: {
        flex: 1,
        marginTop: theme.spacing(3),
        minHeight: 500,
    },
    eventListContent: {
        paddingVertical: theme.spacing(2),
    },
    eventRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing(2),
    },
    eventIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing(1.5),
    },
    eventDetails: {
        flex: 1,
    },
    eventText: {
        fontSize: 16,
        color: theme.colors.bodyText,
    },
    eventTime: {
        fontSize: 14,
        color: theme.colors.bodyText,
    },
    mapCard: {
        flex: 1,
        padding: theme.spacing(2),
        minHeight: 400,
    },
    mapViewContainer: {
        flex: 1,
        borderRadius: theme.radius.md,
        overflow: 'hidden',
        marginBottom: theme.spacing(2),
    },
    columnTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: theme.spacing(2),
        paddingBottom: theme.spacing(1),
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderColor,
    },
    summaryCard: {
        padding: theme.spacing(2),
        marginBottom: theme.spacing(3),
    },
    summaryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing(1),
    },
    summaryLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.headingText,
    },
    summaryValue: {
        fontSize: 16,
        color: theme.colors.bodyText,
    },
    timelineSliderContainer: {
        marginTop: theme.spacing(2),
        paddingHorizontal: theme.spacing(1),
        width: '100%',
    },
    timelineSliderLabel: {
        fontSize: 14,
        color: theme.colors.bodyText,
        marginBottom: theme.spacing(1),
        textAlign: 'center',
    },
    timelineSlider: {
        width: '100%',
        height: 40,
    },
    timeLabelsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: theme.spacing(0.5),
        paddingHorizontal: theme.spacing(1),
    },
    timeLabel: {
        fontSize: 12,
        color: theme.colors.bodyText,
    },
    workerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing(2),
        paddingBottom: theme.spacing(2),
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderColor,
    },
    workerAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: theme.spacing(2),
    },
    workerAvatarPlaceholder: {
        backgroundColor: theme.colors.borderColor,
        justifyContent: 'center',
        alignItems: 'center',
    },
    workerName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.headingText,
    },
    summaryGrid: {
        // No direct changes, but review in context of new layout
    },
});

export default WorkerDailyDetail;
