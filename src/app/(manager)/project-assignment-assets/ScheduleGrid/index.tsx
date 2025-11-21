import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import moment from 'moment';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Layout } from 'react-native-reanimated';
import { Worker } from '../../../../types';
import { Project } from '../../ProjectsContext';
import { Assignment } from '../types';
import { isSameDay } from '../utils/time';
import { theme } from '../../../../theme';

export const TOTAL_HOURS = 24;
const TIME_LABEL_WIDTH = 60;

interface AssignmentBlockProps {
  assignment: Assignment;
  project: Project | undefined;
  selectedDate: Date;
  index: number;
}

const WebSafeView = React.forwardRef(({ children, style, ...rest }: any, ref) => {
  if (Platform.OS === 'web') {
    return (
      <div ref={ref} style={StyleSheet.flatten(style)} {...rest}>
        {children}
      </div>
    );
  } else {
    return (
      <View ref={ref} style={style} {...rest}>
        {children}
      </View>
    );
  }
});

function hexToRgba(hex: string, alpha: number) {
  if (!/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    return `rgba(0,0,0,${alpha})`;
  }
  let c = hex.substring(1).split('');
  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }
  const num = parseInt(c.join(''), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const AssignmentBlock = React.memo(function AssignmentBlock({ assignment, project, selectedDate, index }: AssignmentBlockProps) {
  if (!project) return null;

  return (
    <Draggable draggableId={`assignment-${assignment.id}`} index={index}>
      {(provided, snapshot) => (
        <WebSafeView
          ref={(ref: any) => provided.innerRef(ref)}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={[
            styles.assignmentContainer,
            snapshot.isDragging && styles.dragging,
            provided.draggableProps.style,
          ]}
        >
            <View style={[styles.assignmentContent, { backgroundColor: hexToRgba(project.color, 0.08) }]}>
                <View style={[styles.colorIndicator, { backgroundColor: project.color }]} />
                <View style={styles.assignmentInfo}>
                    <Text style={styles.assignmentName} numberOfLines={1}>{project?.name}</Text>
                    <Text style={styles.assignmentAddress} numberOfLines={1}>{project?.address}</Text>
                </View>
            </View>        
        </WebSafeView>
      )}
    </Draggable>
  );
});

interface WorkerColumnProps {
  worker: Worker;
  projects: Project[];
  assignments: Assignment[];
  selectedDate: Date;
}

const WebSafeScrollView = React.forwardRef(({ children, style, ...rest }: any, ref) => {
  if (Platform.OS === 'web') {
    return (
      <div ref={ref} style={StyleSheet.flatten(style)} {...rest}>
        {children}
      </div>
    );
  } else {
    return (
      <ScrollView ref={ref} style={style} {...rest}>
        {children}
      </ScrollView>
    );
  }
});

const WorkerColumn = React.memo(function WorkerColumn({ worker, projects, assignments, selectedDate }: WorkerColumnProps) {
  const workerAssignments = assignments.filter(
    (a) => a.workerId === worker.id && isSameDay(a.startDate, selectedDate)
  );

  return (
    <View style={styles.workerColumn}>
      <View style={styles.workerColumnHeader}>
        <Text style={styles.workerName}>{worker.full_name}</Text>
      </View>
      <Droppable droppableId={`worker-${worker.id}`} type="TASK" direction="vertical">
        {(provided, snapshot) => (
          <WebSafeScrollView
            ref={(ref: any) => provided.innerRef(ref)}
            {...provided.droppableProps}
            style={[styles.timelineScrollView, snapshot.isDraggingOver && styles.dragOver]}
          >
            <View style={styles.timeline}>
              {workerAssignments.map((assignment, index) => (
                <AssignmentBlock
                  key={assignment.id}
                  assignment={assignment}
                  project={projects.find((p) => p.id === assignment.projectId)}
                  selectedDate={selectedDate}
                  index={index}
                />
              ))}
              {provided.placeholder}
            </View>
          </WebSafeScrollView>
        )}
      </Droppable>
    </View>
  );
});

interface WorkerLaneCopyButtonProps {
  sourceWorkerId: string;
  targetWorkerId: string;
  onCopyAssignments: (sourceWorkerId: string, targetWorkerId: string) => void;
  direction: 'left-to-right' | 'right-to-left';
}

const WorkerLaneCopyButton: React.FC<WorkerLaneCopyButtonProps> = ({ sourceWorkerId, targetWorkerId, onCopyAssignments, direction }) => {
  const iconName = direction === 'left-to-right' ? 'arrow-forward-circle-outline' : 'arrow-back-circle-outline';
  const handlePress = () => {
    onCopyAssignments(sourceWorkerId, targetWorkerId);
  };

  return (
    <TouchableOpacity
      style={styles.copyButton}
      onPress={handlePress}
    >
      <Ionicons name={iconName} size={24} color={theme.colors.primary} />
    </TouchableOpacity>
  );
};

interface ScheduleGridProps {
  workers: Worker[];
  projects: Project[];
  assignments: Assignment[];
  selectedDate: Date;
  selectedWorkers: Worker[];
  onCopyAssignments: (sourceWorkerId: string, targetWorkerId: string) => void;
}

const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  workers,
  projects,
  assignments,
  selectedDate,
  selectedWorkers,
  onCopyAssignments,
}) => {
  const workersToDisplay = selectedWorkers.length > 0 ? workers.filter(w => selectedWorkers.some(sw => sw.id === w.id)) : workers;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        {workersToDisplay.map((worker, index) => (
          <React.Fragment key={worker.id}>
            <Animated.View
              layout={Layout.springify().damping(20).stiffness(100)}
              style={[
                styles.workerColumnWrapper,
                index < workersToDisplay.length - 1 && styles.workerColumnSeparator,
              ]}
            >
              <WorkerColumn
                worker={worker}
                projects={projects}
                assignments={assignments}
                selectedDate={selectedDate}
              />
            </Animated.View>
            {index < workersToDisplay.length - 1 && (
              <View style={styles.copyButtonContainerWrapper}>
                <View style={styles.copyButtonContainer}>
                  <WorkerLaneCopyButton
                    sourceWorkerId={worker.id}
                    targetWorkerId={workersToDisplay[index + 1].id}
                    onCopyAssignments={onCopyAssignments}
                    direction="left-to-right"
                  />
                  <WorkerLaneCopyButton
                    sourceWorkerId={workersToDisplay[index + 1].id}
                    targetWorkerId={worker.id}
                    onCopyAssignments={onCopyAssignments}
                    direction="right-to-left"
                  />
                </View>
              </View>
            )}
          </React.Fragment>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.cardBackground,
  },
  workerColumnWrapper: {},
  workerColumnSeparator: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.borderColor,
  },
  workerColumn: {
    width: 150,
    flex: 1,
  },
  workerColumnHeader: {
    height: 60,
    padding: theme.spacing(1.5),
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.borderColor,
    backgroundColor: theme.colors.pageBackground,
  },
  workerName: {
    fontWeight: '500',
    color: theme.colors.headingText,
  },
  timelineScrollView: {
    flex: 1,
    minHeight: 120,
    padding: theme.spacing(1),
  },
  dragOver: {
    backgroundColor: theme.colors.primaryMuted,
  },
  timeline: {
    flex: 1,
    flexDirection: 'column',
  },
  assignmentContainer: {
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(1),
  },
  dragging: {
    opacity: 0.85,
    ...theme.shadow.soft,
  },
  assignmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(1.5), // Increased padding to make it taller
    borderRadius: theme.radius.md,
  },
  colorIndicator: {
    width: 10,
    height: 10,
    borderRadius: theme.radius.sm,
    marginRight: theme.spacing(1),
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentName: {
    fontWeight: '500',
    fontSize: 11,
    color: theme.colors.headingText,
  },
  assignmentAddress: {
    fontSize: 10, // Smaller font for address
    color: theme.colors.bodyText,
  },
  copyButton: {
    width: theme.spacing(5),
    height: theme.spacing(5),
    borderRadius: theme.spacing(2.5),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryMuted,
    marginVertical: theme.spacing(1),
    ...theme.shadow.soft,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.2s ease-in-out',
    } as any),
  },
  copyButtonContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: theme.spacing(6),
    paddingVertical: theme.spacing(1.5),
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    position: 'absolute',
    left: -theme.spacing(3),
    zIndex: 1,
  },
  copyButtonContainerWrapper: {
    width: 0,
    position: 'relative',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ScheduleGrid;
