import React, { useMemo, useState, useRef, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, LayoutChangeEvent, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAssignments } from '../../../context/AssignmentsContext';
import { useSession } from '~/context/AuthContext';
import { ProcessedAssignmentStepWithStatus, AssignmentStatus, Project } from '~/types'; // Updated import

// Combined and enriched data structure for timeline display
interface TimelineItem {
  id: string; // AssignmentRecord ID
  ref_id: string; // Project or Location ID
  type: 'project' | 'common_location';
  name: string;
  address?: string; // Only for projects
  color: string;
  startTime: string | null; // HH:MM
  status: 'Not Started' | 'In Progress' | 'Completed'; // Derived
  sort_key: string;
}

const getStatusStyle = (status: 'Not Started' | 'In Progress' | 'Completed') => {
  switch (status) {
    case 'Completed':
      return { color: theme.colors.success, icon: 'check-circle' as const, dotColor: theme.colors.success };
    case 'In Progress':
      return { color: theme.colors.warning, icon: 'play-circle' as const, dotColor: theme.colors.warning };
    case 'Not Started':
    default:
      return { color: theme.colors.bodyText, icon: 'circle' as const, dotColor: theme.colors.borderColor };
  }
};

const mapAssignmentStatusToTimelineStatus = (status: AssignmentStatus): 'Not Started' | 'In Progress' | 'Completed' => {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'active':
      return 'In Progress';
    case 'next':
    case 'pending':
    default:
      return 'Not Started';
  }
};

const TimelineCard = ({ item, onPress, onLayout }: { item: TimelineItem; onPress: (id: string) => void; onLayout: (event: LayoutChangeEvent) => void }) => {
  const statusStyle = getStatusStyle(item.status);

  return (
    <View onLayout={onLayout} style={styles.itemWrapper}>
      <View style={styles.itemTimeContainer}>
        {item.startTime ? (
          <>
            <FontAwesome5 name="clock" size={14} color={theme.colors.primary} />
            <Text style={styles.itemTimeText}>Arrival: {item.startTime}</Text>
          </>
        ) : (
          <Text style={styles.itemTimeText}>No specific time</Text>
        )}
      </View>
      <TouchableOpacity onPress={() => onPress(item.ref_id)} disabled={item.type === 'common_location'}> {/* Disable if common_location */}
        <Card style={[styles.itemCard, { borderColor: statusStyle.dotColor, borderWidth: item.status !== 'Not Started' ? 1 : 0 }]}>
          <Text style={styles.subtitle}>{item.name}</Text>
          {item.address ? <Text style={styles.addressText}>{item.address}</Text> : null}
          <View style={styles.statusContainer}>
            <FontAwesome5 name={statusStyle.icon} size={14} color={statusStyle.color} solid={item.status !== 'Not Started'} />
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {item.status}
            </Text>
          </View>
        </Card>
      </TouchableOpacity>
    </View>
  );
};

export default function ProjectsScreen() {
  const router = useRouter();
  const { user } = useSession()!;
  const { processedAssignments, loadAssignmentsForDate, isLoading: assignmentsLoading } = useAssignments();
  const [cardLayouts, setCardLayouts] = useState<{ [key: string]: { y: number, height: number } }>({});
  const containerRef = useRef<ScrollView>(null);

  // Fetch assignments for the worker for today
  useEffect(() => {
    if (user?.id) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      loadAssignmentsForDate(today, [user.id]);
    }
  }, [user?.id, loadAssignmentsForDate]);

  const currentWorkersAssignments = user?.id ? processedAssignments[user.id] || [] : [];

  const todaysPlan = useMemo((): TimelineItem[] => {
    if (!currentWorkersAssignments) return [];
    return currentWorkersAssignments.map((assignment: ProcessedAssignmentStepWithStatus) => {
      let name: string;
      let address: string | undefined;
      let color: string;
      let timelineStatus = mapAssignmentStatusToTimelineStatus(assignment.status);

      // Derive name, address, color based on type
      if (assignment.type === 'project') {
        // Ensure project exists before accessing properties
        name = assignment.project?.name || 'Unnamed Project';
        address = assignment.project?.address;
        color = assignment.project?.color || theme.colors.secondary;
      } else { // common_location
        // Ensure location exists before accessing properties
        name = assignment.location?.name || 'Unnamed Location';
        address = undefined;
        color = theme.colors.secondary;
      }

      return {
        id: assignment.id,
        ref_id: assignment.ref_id,
        type: assignment.type,
        name: name,
        address: address,
        color: color,
        startTime: assignment.start_time || null,
        status: timelineStatus,
        sort_key: assignment.sort_key,
      };
    }); // Already sorted in context
  }, [currentWorkersAssignments]);

  const handleItemPress = (refId: string) => {
    // Only navigate to project details for projects
    const item = todaysPlan.find(tp => tp.ref_id === refId);
    if (item && item.type === 'project') {
      router.push(`/(worker)/projects/${refId}`);
    } else {
      console.log(`Common Location pressed: ${refId}`);
    }
  };

  const handleCardLayout = (assignmentId: string, event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setCardLayouts(prev => ({ ...prev, [assignmentId]: { y, height } }));
  };
  
  // Calculate progress height for the timeline line
  const lastCompletedIndex = useMemo(() => {
    const indices = todaysPlan.map((p, i) => (p.status === 'Completed' || p.status === 'In Progress') ? i : -1);
    return Math.max(...indices);
  }, [todaysPlan]);

  const progressHeight = useMemo(() => {
    if (lastCompletedIndex === -1) return 0;
    const lastCompletedItem = todaysPlan[lastCompletedIndex];
    if (!lastCompletedItem) return 0; // Guard against undefined item
    // Find the layout of the actual assignment card using its assignment.id
    const layout = cardLayouts[lastCompletedItem.id]; 
    if (!layout) return 0;
    // Height to the middle of the last completed card
    return layout.y + layout.height / 2;
  }, [cardLayouts, lastCompletedIndex, todaysPlan]);


  return (
    <AnimatedScreen>
      <ScrollView style={styles.container} ref={containerRef} contentContainerStyle={styles.scrollContentContainer}>
        <Text style={styles.title}>Today's Plan</Text>
        
        {assignmentsLoading && todaysPlan.length === 0 ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loadingIndicator} />
        ) : todaysPlan.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>No assignments scheduled for today.</Text>
            <Text style={styles.emptyStateSubText}>Check back later or contact your manager.</Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            <View style={styles.timelineLineContainer}>
              <View style={styles.timelineLineBackground} />
              <View style={[styles.timelineLineProgress, { height: progressHeight }]} />
            </View>

            <View style={styles.timelineItemsContainer}>
              {todaysPlan.map((item) => (
                <TimelineCard 
                  key={item.id} // Use assignment ID as key
                  item={item} 
                  onPress={handleItemPress}
                  onLayout={(event) => handleCardLayout(item.id, event)} // Pass assignment ID
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  scrollContentContainer: {
    paddingHorizontal: theme.spacing(2),
    paddingBottom: theme.spacing(2),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(3),
  },
  timelineContainer: {
    flexDirection: 'row',
  },
  timelineLineContainer: {
    width: 2,
    marginRight: theme.spacing(2),
    position: 'relative', // For absolute positioning of children
  },
  timelineLineBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.borderColor,
  },
  timelineLineProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
  },
  timelineItemsContainer: {
    flex: 1,
    alignItems: 'stretch',
  },
  itemWrapper: {
    marginBottom: theme.spacing(2),
    width: '100%',
  },
  itemTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
    paddingLeft: theme.spacing(1)
  },
  itemTimeText: {
    color: theme.colors.primary,
    marginLeft: theme.spacing(1),
    fontWeight: 'bold',
  },
  itemCard: {
    padding: theme.spacing(2),
    width: '100%',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.headingText,
  },
  addressText: {
    color: theme.colors.bodyText,
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statusText: {
    marginLeft: theme.spacing(1),
    fontWeight: 'bold',
  },
  loadingIndicator: {
    marginTop: theme.spacing(4),
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(4),
    minHeight: 150,
  },
  emptyStateText: {
    fontSize: 18,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: theme.spacing(1),
  },
  emptyStateSubText: {
    fontSize: 14,
    color: theme.colors.bodyText,
    textAlign: 'center',
  },
});
