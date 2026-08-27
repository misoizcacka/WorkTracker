import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Text } from '../../../components/Themed';
import { useRouter } from 'expo-router';
import { theme } from '../../../theme';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Ionicons } from '@expo/vector-icons';
import { useAssignments } from '../../../context/AssignmentsContext';
import { useSession } from '~/context/AuthContext';
import { ProcessedAssignmentStepWithStatus, AssignmentStatus } from '~/types';
import { useTranslation } from 'react-i18next';
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

const AssignmentCard = ({ item, onPress }: { item: AssignmentItem; onPress: (refId: string) => void }) => {
  const visited = item.status === 'completed' || item.status === 'active';
  const isActive = item.status === 'active';
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      onPress={() => item.type === 'project' && onPress(item.ref_id)}
      disabled={item.type === 'common_location'}
      activeOpacity={item.type === 'project' ? 0.7 : 1}
    >
      <View style={[styles.assignmentRow, isActive && styles.assignmentRowActive]}>
        <View style={[styles.visitDot, visited ? styles.visitDotVisited : styles.visitDotUnvisited]}>
          {visited && <Ionicons name="checkmark" size={12} color="white" />}
        </View>

        <View style={styles.assignmentInfo}>
          <Text style={styles.projectName} fontType="bold" numberOfLines={1}>{item.name}</Text>
          {item.address ? (
            <Text style={styles.projectAddress} numberOfLines={1}>{item.address}</Text>
          ) : item.startTime ? (
            <Text style={styles.projectAddress}>{item.startTime}</Text>
          ) : null}
        </View>

        <View style={styles.assignmentRight}>
          {isActive && (
            <View style={styles.activePill}>
              <Text style={styles.activePillText} fontType="bold">{t('worker.projects.active')}</Text>
            </View>
          )}
          {item.type === 'project' && (
            <Ionicons name="chevron-forward" size={16} color={theme.colors.disabledText} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function ProjectsScreen() {
  const router = useRouter();
  const { user } = useSession()!;
  const { processedAssignments, loadAssignmentsForDate, isLoading: assignmentsLoading } = useAssignments();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { t } = useTranslation();

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
          <Text style={styles.headerTitle} fontType="bold">{t('worker.projects.title')}</Text>
          <Text style={styles.headerSubtitle}>{moment().format('dddd, MMMM D')}</Text>
        </View>
        
        {assignmentsLoading && todaysAssignments.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : todaysAssignments.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={32} color={theme.colors.disabledText} />
            </View>
            <Text style={styles.emptyText} fontType="bold">{t('worker.projects.noAssignments')}</Text>
            <Text style={styles.emptySubText}>{t('worker.projects.noAssignmentsSub')}</Text>
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
    fontSize: theme.fontSizes.sm,
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
    paddingHorizontal: theme.spacing(4),
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  emptyText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.disabledText,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    backgroundColor: theme.colors.cardBackground,
    overflow: 'hidden',
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  assignmentRowActive: {
    backgroundColor: theme.colors.primaryMuted,
  },
  visitDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing(2),
    flexShrink: 0,
  },
  visitDotVisited: {
    backgroundColor: theme.colors.primary,
  },
  visitDotUnvisited: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.borderColor,
  },
  assignmentInfo: {
    flex: 1,
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
  assignmentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activePill: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  activePillText: {
    color: 'white',
    fontSize: 11,
  },
});
