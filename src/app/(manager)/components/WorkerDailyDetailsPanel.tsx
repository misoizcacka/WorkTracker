import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Image, Platform } from 'react-native';
import moment from 'moment';

import { Text } from '~/components/Themed';
import { theme } from '~/theme';
import { supabase } from '~/utils/supabase';
import DailyWorkerMap from '~/components/DailyWorkerMap';
import { Assignment, LocationEvent, useMapGeoJSON } from '~/hooks/useMapGeoJSON';
import { Ionicons } from '@expo/vector-icons';
import { Region } from 'react-native-maps';

interface DailyEvent {
  event_id: string;
  event_timestamp: string;
  event_type: 'enter_geofence' | 'exit_geofence';
  ref_name: string;
  ref_address: string;
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

interface WorkerDailyDetailsPanelProps {
  workerId: string | undefined;
  date: Date;
}

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  return R * c;
};

const WorkerDailyDetailsPanel = ({ workerId, date }: WorkerDailyDetailsPanelProps) => {
  const [events, setEvents] = useState<DailyEvent[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region | undefined>(undefined);
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined);
  const [projects, setProjects] = useState<any[]>([]);
  const [commonLocations, setCommonLocations] = useState<any[]>([]);

  const locationEvents: LocationEvent[] = useMemo(() => {
    return events.map(event => ({
      lat: event.latitude,
      lng: event.longitude,
      timestamp: event.event_timestamp,
      type: event.event_type
    }));
  }, [events]);

  const assignments: any[] = useMemo(() => {
    interface Visit {
      startTime: string;
      endTime: string;
      isStillThere?: boolean;
    }
    
    interface GroupedProject {
      id: string;
      name: string;
      address: string;
      lat: number;
      lng: number;
      visits: Visit[];
      totalDurationMinutes: number;
    }
    
    const projectGroups: Map<string, GroupedProject> = new Map();
    const activeVisits: Map<string, string> = new Map(); // name -> startTime

    // Helper to find project/location details
    const getSiteDetails = (name: string) => {
      const p = projects.find(p => p.name === name);
      if (p) return { lat: p.latitude, lng: p.longitude, address: p.address || '', id: p.id };
      const cl = commonLocations.find(l => l.name === name);
      if (cl) return { lat: Number(cl.latitude), lng: Number(cl.longitude), address: cl.address || '', id: cl.id };
      return null;
    };

    events.forEach((event) => {
      if (event.event_type === 'enter_geofence') {
        activeVisits.set(event.ref_name, event.event_timestamp);
      } else if (event.event_type === 'exit_geofence') {
        const startTime = activeVisits.get(event.ref_name);
        if (startTime) {
          const details = getSiteDetails(event.ref_name);
          if (details) {
            const existing = projectGroups.get(event.ref_name);
            const visit: Visit = { startTime, endTime: event.event_timestamp };
            const duration = moment(visit.endTime).diff(moment(visit.startTime), 'minutes');
            
            if (existing) {
              existing.visits.push(visit);
              existing.totalDurationMinutes += duration;
            } else {
              projectGroups.set(event.ref_name, {
                ...details,
                name: event.ref_name,
                visits: [visit],
                totalDurationMinutes: duration
              });
            }
          }
          activeVisits.delete(event.ref_name);
        }
      }
    });

    // Handle ongoing visits
    activeVisits.forEach((startTime, name) => {
      const details = getSiteDetails(name);
      if (details) {
        const isToday = moment(date).isSame(moment(), 'day');
        const endTime = isToday ? moment().toISOString() : moment(date).endOf('day').toISOString();
        const visit: Visit = { startTime, endTime, isStillThere: isToday };
        const duration = moment(visit.endTime).diff(moment(visit.startTime), 'minutes');
        
        const existing = projectGroups.get(name);
        if (existing) {
          existing.visits.push(visit);
          existing.totalDurationMinutes += duration;
        } else {
          projectGroups.set(name, {
            ...details,
            name,
            visits: [visit],
            totalDurationMinutes: duration
          });
        }
      }
    });

    // Convert to array and sort by first visit start time
    return Array.from(projectGroups.values()).sort((a, b) => 
      moment(a.visits[0].startTime).valueOf() - moment(b.visits[0].startTime).valueOf()
    );
  }, [events, date, projects, commonLocations]);

  // Adapt for useMapGeoJSON
  const flatAssignments: Assignment[] = useMemo(() => {
    return assignments.map((a, idx) => ({
      id: a.id,
      name: a.name,
      address: a.address,
      lat: a.lat,
      lng: a.lng,
      startTime: a.visits[0].startTime,
      endTime: a.visits[a.visits.length - 1].endTime,
      sortKey: idx
    }));
  }, [assignments]);

  const { assignmentPointsGeoJSON, assignmentSegmentsGeoJSON, fullTrailGeoJSON, trackingDotsGeoJSON } = useMapGeoJSON({ 
    assignments: flatAssignments, 
    locationEvents, 
    reportDate: date 
  });

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
    if (!workerId || !date) return;

    const fetchDetails = async () => {
      setLoading(true);
      
      const [projRes, locRes, detailsRes] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('common_locations').select('*'),
        supabase.rpc('get_worker_daily_details', {
          worker_id_param: workerId,
          report_date: moment(date).format('YYYY-MM-DD'),
        })
      ]);

      if (projRes.data) setProjects(projRes.data);
      if (locRes.data) setCommonLocations(locRes.data);

      if (detailsRes.error) {
        console.error('Error fetching daily details:', detailsRes.error);
        setEvents([]);
      } else {
        setEvents(detailsRes.data || []);
        if (detailsRes.data && detailsRes.data.length > 0) {
            setMapRegion({
                latitude: detailsRes.data[0].latitude,
                longitude: detailsRes.data[0].longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            });
            setDailySummary(prev => (prev ? ({
                ...prev,
                approx_travelled_km: calculateKilometers(detailsRes.data),
            }) : null));
        }
      }
      setLoading(false);
    };

    const fetchSummary = async () => {
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
                    ...data[0],
                    total_hours_worked: data[0].total_hours_worked || 0,
                    total_break_minutes: data[0].total_break_minutes || 0,
                    total_work_sessions: data[0].total_work_sessions || 0,
                    approx_travelled_km: 0
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

  const renderEvent = (event: DailyEvent) => {
    const isEnter = event.event_type === 'enter_geofence';
    return (
      <View key={event.event_id} style={styles.tableRow}>
        <View style={styles.colIcon}>
            <View style={[styles.eventBadge, {backgroundColor: isEnter ? theme.statusColors.successBackground : theme.statusColors.warningBackground}]}>
                <Ionicons name={isEnter ? "enter-outline" : "exit-outline"} size={16} color={isEnter ? theme.colors.success : theme.colors.danger} />
            </View>
        </View>
        <View style={styles.colEventDesc}>
            <Text style={styles.eventText} fontType="medium" numberOfLines={1}>
                {isEnter ? "Entered" : "Exited"} {event.ref_name}
            </Text>
            <Text style={styles.eventSubtext} fontType="regular">
                {moment(event.event_timestamp).format('hh:mm:ss A')}
            </Text>
        </View>
      </View>
    );
  };

  if ((loading || loadingSummary)) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (events.length === 0 && !dailySummary) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="calendar-outline" size={64} color={theme.colors.borderColor} />
        <Text style={styles.emptyText} fontType="regular">No activity found for this worker on the selected date.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {dailySummary && (
        <View style={styles.statsRow}>
            <View style={styles.workerInfo}>
                <View style={styles.avatarContainer}>
                    {dailySummary.worker_avatar_url ? (
                        <Image source={{ uri: dailySummary.worker_avatar_url }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={24} color={theme.colors.bodyText} />
                        </View>
                    )}
                </View>
                <View>
                    <Text style={styles.workerName} fontType="bold">{dailySummary.worker_full_name}</Text>
                    <Text style={styles.workerSubtext} fontType="regular">{moment(date).format('MMMM D, YYYY')}</Text>
                </View>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statBox}>
                <Text style={styles.statLabel} fontType="bold">Total Hours</Text>
                <Text style={styles.statValue} fontType="bold">{dailySummary.total_hours_worked.toFixed(2)}h</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statBox}>
                <Text style={styles.statLabel} fontType="bold">Distance</Text>
                <Text style={styles.statValue} fontType="bold">{dailySummary.approx_travelled_km}km</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statBox}>
                <Text style={styles.statLabel} fontType="bold">Total Events</Text>
                <Text style={styles.statValue} fontType="bold">{events.length}</Text>
            </View>
        </View>
      )}

      <View style={styles.contentLayout}>
        <View style={styles.leftColumn}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} fontType="bold">Activity Timeline</Text>
            </View>
            <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.colIcon]} fontType="bold"></Text>
                    <Text style={[styles.tableHeaderText, styles.colEventDesc]} fontType="bold">Event Details</Text>
                </View>
                <ScrollView showsVerticalScrollIndicator={true} style={styles.timelineScroll}>
                    {events.filter(e => e.event_type === 'enter_geofence' || e.event_type === 'exit_geofence')
                            .slice().reverse().map(event => renderEvent(event))}
                </ScrollView>
            </View>
        </View>

        <View style={styles.rightColumn}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} fontType="bold">Location Replay</Text>
            </View>
            <View style={styles.mapContainer}>
                <View style={styles.mapViewWrapper}>
                    <DailyWorkerMap
                        style={{ flex: 1 }}
                        zoom={mapZoom}
                        onWebZoomChange={setMapZoom}
                        assignments={assignments}
                        locationEvents={locationEvents}
                        workerId={workerId || ''}
                        assignmentPointsGeoJSON={assignmentPointsGeoJSON}
                        assignmentSegmentsGeoJSON={assignmentSegmentsGeoJSON}
                        fullTrailGeoJSON={fullTrailGeoJSON}
                        trackingDotsGeoJSON={trackingDotsGeoJSON}
                    />
                </View>
            </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.cardBackground,
    },
    scrollContent: {
        padding: theme.spacing(3),
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing(10),
    },
    emptyText: {
        marginTop: theme.spacing(2),
        fontSize: theme.fontSizes.md,
        color: theme.colors.bodyText,
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: theme.colors.pageBackground,
        borderRadius: theme.radius.lg,
        padding: theme.spacing(2),
        marginBottom: theme.spacing(3),
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
        alignItems: 'center',
    },
    workerInfo: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: theme.spacing(1.5),
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.borderColor,
        justifyContent: 'center',
        alignItems: 'center',
    },
    workerName: {
        fontSize: theme.fontSizes.lg,
        color: theme.colors.headingText,
    },
    workerSubtext: {
        fontSize: theme.fontSizes.xs,
        color: theme.colors.bodyText,
    },
    statDivider: {
        width: 1,
        height: '60%',
        backgroundColor: theme.colors.borderColor,
        marginHorizontal: theme.spacing(2),
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: theme.fontSizes.xs,
        color: theme.colors.bodyText,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    statValue: {
        fontSize: theme.fontSizes.lg,
        color: theme.colors.primary,
    },
    contentLayout: {
        flexDirection: 'row',
        gap: theme.spacing(3),
        ...Platform.select({
            native: {
                flexDirection: 'column',
            }
        })
    },
    leftColumn: {
        flex: 1.2,
    },
    rightColumn: {
        flex: 2,
    },
    sectionHeader: {
        marginBottom: theme.spacing(2),
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderColor,
        paddingBottom: theme.spacing(1),
    },
    sectionTitle: {
        fontSize: theme.fontSizes.md,
        color: theme.colors.headingText,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    tableContainer: {
        backgroundColor: theme.colors.pageBackground,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
        overflow: 'hidden',
        minHeight: 650,
    },
    timelineScroll: {
        flex: 1,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: theme.colors.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderColor,
        paddingVertical: theme.spacing(1.5),
    },
    tableHeaderText: {
        fontSize: theme.fontSizes.xs,
        color: theme.colors.headingText,
        paddingHorizontal: theme.spacing(1.5),
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderColor,
        paddingVertical: theme.spacing(1.5),
        backgroundColor: theme.colors.cardBackground,
    },
    colIcon: {
        width: 50,
        alignItems: 'center',
    },
    colEventDesc: {
        flex: 1,
        paddingRight: theme.spacing(1.5),
    },
    eventBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    eventText: {
        fontSize: theme.fontSizes.sm,
        color: theme.colors.headingText,
    },
    eventSubtext: {
        fontSize: theme.fontSizes.xs,
        color: theme.colors.bodyText,
    },
    mapContainer: {
        flex: 1,
        backgroundColor: theme.colors.pageBackground,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
        overflow: 'hidden',
        minHeight: 650,
    },
    mapViewWrapper: {
        flex: 1,
    }
});

export default WorkerDailyDetailsPanel;
