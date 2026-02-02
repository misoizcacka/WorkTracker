import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '~/components/Themed';
import Slider from '@react-native-community/slider';
import moment from 'moment';

import { Card } from '~/components/Card';
import { theme } from '~/theme';
import { supabase } from '~/utils/supabase';
import { MapView } from '~/components/MapView';
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

interface DailySummary { // Still need this for first_session_start_time, last_session_end_time_or_eod
  first_session_start_time: string | null;
  last_session_end_time_or_eod: string | null;
}

interface LocationReplayMapOnlyPanelProps {
  workerId: string | undefined;
  date: Date;
}

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

const LocationReplayMapOnlyPanel = ({ workerId, date }: LocationReplayMapOnlyPanelProps) => {
  const [events, setEvents] = useState<DailyEvent[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region | undefined>(undefined);
  const [selectedMapTime, setSelectedMapTime] = useState<number | null>(null);
  const [temporarySelectedMapTime, setTemporarySelectedMapTime] = useState<number | null>(null);
  const [inferredLocation, setInferredLocation] = useState<DailyEvent | null>(null);
  const [sliderMinTime, setSliderMinTime] = useState<number | null>(null);
  const [sliderMaxTime, setSliderMaxTime] = useState<number | null>(null);
  const [mapWorker, setMapWorker] = useState<WorkerLocation[]>([]);
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (inferredLocation && dailySummary && workerId) {
      setMapWorker([{
        id: workerId,
        name: "Worker", // Placeholder name, as full_name is not in this summary
        // avatar: dailySummary.worker_avatar_url || undefined, // Not in this summary
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
  }, [inferredLocation, dailySummary, workerId]);

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
    if (!workerId || !date) {
        setEvents([]);
        setDailySummary(null);
        setMapWorker([]);
        return;
    };

    const fetchDetails = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_worker_daily_details', {
        worker_id_param: workerId,
        report_date: moment(date).format('YYYY-MM-DD'),
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
            // Update kilometers in summary after events are fetched - not needed here as no summary displayed
        }
      }
      setLoading(false);
    };

    const fetchSummary = async () => { // Only fetching start/end times here
        setLoadingSummary(true);
        const { data, error } = await supabase.rpc('get_worker_daily_summary', {
            worker_id_param: workerId,
            report_date: moment(date).format('YYYY-MM-DD'),
        });

        if (error) {
            console.error('Error fetching daily summary:', error);
            setDailySummary(null);
        } else {
            if (data && data.length > 0) {
                const summaryData = {
                    first_session_start_time: data[0].first_session_start_time,
                    last_session_end_time_or_eod: data[0].last_session_end_time_or_eod,
                };
                setDailySummary(summaryData);
            } else {
                setDailySummary(null);
            }
        }
        setLoadingSummary(false);
    };

    fetchDetails();
    fetchSummary();
  }, [workerId, date, calculateKilometers]);

  // Effect to initialize selectedMapTime and map region when all data is loaded
  useEffect(() => {
    if (!dailySummary || !date || (loading || loadingSummary)) {
      return;
    }

    let minTime: number;
    let maxTime: number;

    if (dailySummary.first_session_start_time) {
        minTime = moment(dailySummary.first_session_start_time).valueOf();
    } else if (events.length > 0) {
        minTime = moment(events[0].event_timestamp).valueOf();
    } else {
        minTime = moment(date).startOf('day').valueOf();
    }

    if (dailySummary.last_session_end_time_or_eod) {
        maxTime = moment(dailySummary.last_session_end_time_or_eod).valueOf();
    } else if (events.length > 0) {
        maxTime = moment(events[events.length - 1].event_timestamp).valueOf();
    } else {
        maxTime = moment(date).endOf('day').valueOf();
    }

    if (selectedMapTime === null || selectedMapTime < minTime || selectedMapTime > maxTime) {
        setSelectedMapTime(minTime);
        setTemporarySelectedMapTime(minTime);
    }

    if (!mapRegion && events.length > 0 && inferredLocation) {
        setMapRegion({
            latitude: inferredLocation.latitude,
            longitude: inferredLocation.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
        });
        setMapZoom(12);
    }

    setSliderMinTime(minTime);
    setSliderMaxTime(maxTime);

  }, [dailySummary, events, date, loading, loadingSummary, selectedMapTime, mapRegion, inferredLocation, temporarySelectedMapTime]);

  // Effect to update inferred location based on selectedMapTime and events
  useEffect(() => {
    if (selectedMapTime === null || events.length === 0) {
      setInferredLocation(null);
      return;
    }

    let foundEvent: DailyEvent | null = null;

    for (let i = events.length - 1; i >= 0; i--) {
        const current = events[i];
        const currentTime = moment(current.event_timestamp).valueOf();
        if (currentTime <= selectedMapTime) {
            foundEvent = current;
            break;
        }
    }

    if (!foundEvent && events.length > 0) {
        foundEvent = events[0];
    }

    setInferredLocation(foundEvent);
  }, [selectedMapTime, events]);


  // New useEffect to update mapRegion when inferredLocation changes
  useEffect(() => {
    if (inferredLocation) {
      setMapRegion(prevRegion => ({
        latitude: inferredLocation.latitude,
        longitude: inferredLocation.longitude,
        latitudeDelta: prevRegion?.latitudeDelta || 0.0922,
        longitudeDelta: prevRegion?.longitudeDelta || 0.0421,
        zoom: mapZoom ?? 12,
      }));
    }
  }, [inferredLocation, mapZoom]);

  if (!workerId || !date) {
    return (
      <Card style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing(3) }}>
        <Text style={{ color: theme.colors.bodyText, fontSize: 18 }} fontType="regular">Select a worker and date to view location replay.</Text>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      {(loading || loadingSummary) ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{flex: 1, marginTop: 50}}/>
      ) : (
          <>
              {events.length === 0 && !dailySummary ? (
                  <Card style={{padding: 20, alignItems: 'center'}}><Text fontType="regular">No data found for this day.</Text></Card>
              ) : (
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
                              <Text style={styles.timelineSliderLabel} fontType="regular">
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
                                  <Text style={styles.timeLabel} fontType="regular">{moment(sliderMaxTime).format('HH:mm')}</Text>
                              </View>
                          </View>
                      )}
                  </Card>
              )}
          </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.pageBackground, padding: theme.spacing(3) },
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
});

export default LocationReplayMapOnlyPanel;
