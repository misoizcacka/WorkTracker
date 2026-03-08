import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Text } from '../../../components/Themed';
import { useRouter } from 'expo-router';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Ionicons } from '@expo/vector-icons';
import { useAssignments } from '../../../context/AssignmentsContext';
import { useSession } from '~/context/AuthContext';
import { ProcessedAssignmentStepWithStatus, AssignmentStatus } from '~/types';
import moment from 'moment';

// Combined and enriched data structure for project list
interface AssignmentItem {
  id: string;
  ref_id: string;
  type: 'project' | 'common_location';
  name: string;
  address?: string;
  startTime: string | null;
  status: AssignmentStatus;
}

const getStatusBadgeStyle = (status: AssignmentStatus) => {
  switch (status) {
    case 'completed':
      return { 
        bg: theme.statusColors.successBackground, 
        text: theme.statusColors.successText, 
        label: 'COMPLETED',
        icon: 'checkmark-circle' as const 
      };
    case 'active':
      return { 
        bg: theme.statusColors.activeBackground, 
        text: theme.statusColors.activeText, 
        label: 'IN PROGRESS',
        icon: 'play-circle' as const 
      };
    case 'next':
      return { 
        bg: theme.statusColors.nextBackground, 
        text: theme.statusColors.nextText, 
        label: 'UP NEXT',
        icon: 'arrow-forward-circle' as const 
      };
    case 'pending':
    default:
      return { 
        bg: theme.statusColors.neutralBackground, 
        text: theme.statusColors.neutralText, 
        label: 'PENDING',
        icon: 'ellipse-outline' as const 
      };
  }
};

const AssignmentCard = ({ item, onPress }: { item: AssignmentItem; onPress: (refId: string) => void }) => {
  const badge = getStatusBadgeStyle(item.status);

  return (
    <Card style={styles.assignmentCard}>
      <TouchableOpacity 
        onPress={() => onPress(item.ref_id)} 
        disabled={item.type === 'common_location'}
        style={styles.cardTouchable}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: item.status === 'active' ? theme.colors.primary : theme.colors.primaryMuted }]}>
            <Ionicons 
              name={item.type === 'project' ? "business-outline" : "pin-outline"} 
              size={20} 
              color={item.status === 'active' ? 'white' : theme.colors.bodyText} 
            />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.projectName} fontType="bold">{item.name}</Text>
            {item.address && (
              <Text style={styles.projectAddress} numberOfLines={1}>{item.address}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badge.text }]} fontType="bold">
              {badge.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerDetail}>
            <Ionicons name="time-outline" size={14} color={theme.colors.disabledText} />
            <Text style={styles.footerText}>
              {item.startTime ? `Scheduled: ${item.startTime}` : 'No fixed time'}
            </Text>
          </View>
          {item.type === 'project' && (
            <Ionicons name="chevron-forward" size={16} color={theme.colors.disabledText} />
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );
};

export default function ProjectsScreen() {
  const router = useRouter();
  const { user } = useSession()!;
  const { processedAssignments, loadAssignmentsForDate, isLoading: assignmentsLoading } = useAssignments();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async (forceFetchFromSupabase = false) => {
    if (user?.id) {
      const today = moment().format('YYYY-MM-DD');
      await loadAssignmentsForDate(today, [user.id], forceFetchFromSupabase);
    }
  }, [user?.id, loadAssignmentsForDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData(true);
    setIsRefreshing(false);
  }, [fetchData]);

  const currentWorkersAssignments = useMemo(() => {
    return user?.id ? processedAssignments[user.id] || [] : [];
  }, [user?.id, processedAssignments]);

  const todaysAssignments = useMemo((): AssignmentItem[] => {
    return currentWorkersAssignments.map((assignment: ProcessedAssignmentStepWithStatus) => ({
      id: assignment.id,
      ref_id: assignment.ref_id,
      type: assignment.type,
      name: assignment.type === 'project' ? (assignment.project?.name || 'Unnamed Project') : (assignment.location?.name || 'Unnamed Location'),
      address: assignment.type === 'project' ? assignment.project?.address : undefined,
      startTime: assignment.start_time || null,
      status: assignment.status,
    }));
  }, [currentWorkersAssignments]);

  const handleItemPress = (refId: string) => {
    const item = todaysAssignments.find(a => a.ref_id === refId);
    if (item && item.type === 'project') {
      router.push(`/(worker)/projects/${refId}`);
    }
  };

  return (
    <AnimatedScreen>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle} fontType="bold">Today's Schedule</Text>
          <Text style={styles.headerSubtitle}>{moment().format('dddd, MMMM D')}</Text>
        </View>
        
        {assignmentsLoading && todaysAssignments.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : todaysAssignments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={theme.colors.borderColor} />
            <Text style={styles.emptyText} fontType="medium">No assignments for today.</Text>
            <Text style={styles.emptySubText}>Your schedule will appear here once assigned.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {todaysAssignments.map((item) => (
              <AssignmentCard 
                key={item.id} 
                item={item} 
                onPress={handleItemPress}
              />
            ))}
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
  scrollContent: {
    padding: theme.spacing(3),
  },
  header: {
    marginBottom: theme.spacing(3),
  },
  headerTitle: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
  },
  headerSubtitle: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.bodyText,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.disabledText,
    marginTop: 8,
    textAlign: 'center',
  },
  listContainer: {
    gap: theme.spacing(2),
  },
  assignmentCard: {
    borderRadius: theme.radius.lg,
    padding: 0, // Reset padding to handle touchable correctly
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  cardTouchable: {
    padding: theme.spacing(2),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing(2),
  },
  titleContainer: {
    flex: 1,
    marginRight: theme.spacing(1),
  },
  projectName: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  projectAddress: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing(1),
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  statusBadgeText: {
    fontSize: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(1.5),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  footerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.disabledText,
  },
});
