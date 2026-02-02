import React from 'react';
import { View, StyleSheet, ScrollView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '~/components/Themed';
import { Droppable, Draggable, DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Layout } from 'react-native-reanimated';
import { Employee, ProcessedAssignmentStep } from '~/types';
import { theme } from '~/theme';

// --- Helper Components ---

const WebSafeView = React.forwardRef(({ children, style, ...rest }: any, ref) => {
    if (Platform.OS === 'web') {
      return (
        <div ref={ref} style={StyleSheet.flatten(style)} {...rest}>
          {children}
        </div>
      );
    }
    return <View ref={ref} style={style} {...rest}>{children}</View>;
});

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

// --- Main Components ---

interface AssignmentBlockProps {
  assignment: ProcessedAssignmentStep;
  workerId: string;
  index: number;
  onDeleteAssignment: (workerId: string, stepId: string) => void;
  onEditAssignmentTime: (workerId: string, stepId: string, startTime: string | null) => void;    
  isPastDate: boolean;
}

const AssignmentBlock = React.memo(function AssignmentBlock({
  assignment,
  workerId,
  index,
  onDeleteAssignment,
  onEditAssignmentTime,
  isPastDate
}: AssignmentBlockProps) {

  // You can adjust these values to fine-tune the clone's position relative to the cursor
  const DRAG_OFFSET_X = -300; // Move left by 30px
  const DRAG_OFFSET_Y = -200; // Move up by 15px

  // Helper function to apply an offset to an existing transform
  const getOffsetTransform = (providedTransform: string | undefined, offsetX: number, offsetY: number): string => {
    if (!providedTransform || providedTransform === 'none') {
      return `translate(${offsetX}px, ${offsetY}px)`;
    }

    // Attempt to parse existing translate values
    const match = providedTransform.match(/translate\(([^,]+), ([^)]+)\)/);
    let currentX = 0;
    let currentY = 0;

    if (match) {
      currentX = parseFloat(match[1]);
      currentY = parseFloat(match[2]);
    } else {
      // If there's another transform, we just layer on a new translate
      return `${providedTransform} translate(${offsetX}px, ${offsetY}px)`;
    }

    // Combine with the new offset
    return providedTransform.replace(
      /translate\(([^,]+), ([^)]+)\)/,
      `translate(${currentX + offsetX}px, ${currentY + offsetY}px)`
    );
  };

  const content = assignment.type === 'project' ? (
    assignment.project ? (
      <View style={[styles.assignmentContent, { backgroundColor: hexToRgba(assignment.project.color, 0.08) }]}>
        <View style={[styles.colorIndicator, { backgroundColor: assignment.project.color }]} />    
        <View style={styles.assignmentInfo}>
          <Text style={styles.assignmentName} numberOfLines={1} fontType="medium">{assignment.project.name}</Text>   
          <Text style={styles.assignmentAddress} numberOfLines={1} fontType="regular">{assignment.project.address}</Text>
        </View>
      </View>
    ) : (
      <View style={[styles.assignmentContent, styles.assignmentPlaceholder]}>
        <ActivityIndicator size="small" />
        <Text style={styles.placeholderText} fontType="regular">Loading Project...</Text>
      </View>
    )
  ) : (
    assignment.location ? (
      <View style={[styles.assignmentContent, { backgroundColor: theme.colors.cardBackground }]}>  
        <View style={[styles.colorIndicator, { backgroundColor: theme.colors.secondary }]} />      
        <View style={styles.assignmentInfo}>
          <Text style={styles.assignmentName} numberOfLines={1} fontType="medium">{assignment.location.name}</Text>  
        </View>
      </View>
    ) : (
      <View style={[styles.assignmentContent, styles.assignmentPlaceholder]}>
        <ActivityIndicator size="small" />
        <Text style={styles.placeholderText}>Loading Location...</Text>
      </View>
    )
  );

  return (
    <Draggable draggableId={assignment.id} index={index} isDragDisabled={isPastDate}>
      {(provided, snapshot) => (
        <WebSafeView
          ref={(ref: any) => provided.innerRef(ref)}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={[
            styles.assignmentContainer,
            snapshot.isDragging && styles.dragging,
            { // Apply dnd's style, and potentially our custom offset to its transform
              ...provided.draggableProps.style,
              transform: snapshot.isDragging
                ? getOffsetTransform(provided.draggableProps.style?.transform, DRAG_OFFSET_X, DRAG_OFFSET_Y)
                : provided.draggableProps.style?.transform,
            },
          ]}
        >
          <TouchableOpacity
            onLongPress={() => onEditAssignmentTime(workerId, assignment.id, assignment.start_time ?? null)}
            disabled={isPastDate}
            style={styles.touchableWrapper}
          >
            <View>
              {content}
              {assignment.start_time && (
                <View style={styles.timeInfoContainer}>
                    <Ionicons name="time-outline" size={14} color={theme.colors.bodyText} style={styles.timeIcon} />
                    <Text style={styles.assignmentTime} fontType="bold">Be there at: {assignment.start_time}</Text>
                </View>
              )}
            </View>
              {!isPastDate && (
                <TouchableOpacity style={styles.deleteButton} onPress={() => onDeleteAssignment(workerId, assignment.id)}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.danger} />
                </TouchableOpacity>
              )}
          </TouchableOpacity>
        </WebSafeView>
      )}
    </Draggable>
  );
});
interface WorkerColumnProps {
  employee: Employee;
  assignments: ProcessedAssignmentStep[];
  onDeleteAssignment: (workerId: string, stepId: string) => void;
  onEditAssignmentTime: (workerId: string, stepId: string, startTime: string | null) => void;
  onAddAssignment: (workerId: string) => void;
  isPastDate: boolean;
}

const WorkerColumn = React.memo(function WorkerColumn({
  employee,
  assignments,
  onDeleteAssignment,
  onEditAssignmentTime,
  onAddAssignment,
  isPastDate
}: WorkerColumnProps) {

  return (
    <View style={styles.workerColumn}>
      <View style={styles.workerColumnHeader}>
        <Text style={styles.workerName} fontType="medium">{employee.full_name}</Text>
      </View>
      <Droppable droppableId={`worker-${employee.id}`} type="TASK" direction="vertical" isDropDisabled={isPastDate}>
        {(provided, snapshot) => (
                    <View
                      ref={(ref: any) => provided.innerRef(ref)}
                      {...provided.droppableProps}
                      style={[styles.timelineScrollView, snapshot.isDraggingOver && styles.dragOver]}      
                    >
                      <WebSafeScrollView style={styles.timelineInnerScrollView}>
                        <View style={styles.timeline}>
                          {assignments.map((assignment, index) => (
                            <AssignmentBlock
                              key={assignment.id}
                              assignment={assignment}
                              workerId={employee.id}
                              index={index}
                              onDeleteAssignment={onDeleteAssignment}
                              onEditAssignmentTime={onEditAssignmentTime}
                              isPastDate={isPastDate}
                            />
                          ))}
                          {provided.placeholder}
                        </View>
                      </WebSafeScrollView>
                    </View>        )}
      </Droppable>
    </View>
  );
});

interface ScheduleGridProps {
  employees: Employee[];
  assignments: Record<string, ProcessedAssignmentStep[]>;
  selectedEmployees: Employee[];
  onDeleteAssignment: (workerId: string, stepId: string) => void;
  onEditAssignmentTime: (workerId: string, stepId: string, startTime: string | null) => void;
  onAddAssignment: (workerId: string) => void;
  isPastDate: boolean;
}

const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  employees,
  assignments,
  selectedEmployees,
  onDeleteAssignment,
  onEditAssignmentTime,
  onAddAssignment,
  isPastDate,
}) => {
  const employeesToDisplay = selectedEmployees.length > 0 ? employees.filter(e => selectedEmployees.some(se => se.id === e.id)) : employees;

  return (
    <View style={[styles.container, isPastDate && styles.pastDateOverlay]}>
      <ScrollView horizontal contentContainerStyle={styles.scrollViewContent} showsHorizontalScrollIndicator={true}>
        {employeesToDisplay.map((employee, index) => (
          <React.Fragment key={employee.id}>
            <Animated.View
              layout={Layout.springify().damping(20).stiffness(100)}
              style={[
                styles.workerColumnWrapper,
                index < employeesToDisplay.length - 1 && styles.workerColumnSeparator,
              ]}
            >
              <WorkerColumn
                employee={employee}
                assignments={assignments[employee.id] || []}
                onDeleteAssignment={onDeleteAssignment}
                onEditAssignmentTime={onEditAssignmentTime}
                onAddAssignment={onAddAssignment}
                isPastDate={isPastDate}
              />
            </Animated.View>
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
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.cardBackground,
  },
  pastDateOverlay: {
    opacity: 0.5,
    pointerEvents: 'none', // Disable interactions
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
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  timelineScrollView: {
    flex: 1,
    minHeight: 120,
    padding: theme.spacing(1),
  },
  timelineInnerScrollView: { // New style
    flex: 1,
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
    position: 'relative',
    boxSizing: 'border-box',
    width: '100%',
  },
  touchableWrapper: {
    flex: 1, // Ensure the TouchableOpacity takes full height/width
  },
  dragging: {
    opacity: 0.85, // Original item fades out
    ...theme.shadow.soft,
  },
  dragOffset: {
    marginLeft: 0,
    marginTop: 0,
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
  assignmentPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.pageBackground,
  },
  placeholderText: {
    marginLeft: theme.spacing(1),
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    fontStyle: 'italic',
  },
  assignmentName: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.headingText,
  },
  assignmentAddress: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
  },
  timeInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timeIcon: {
    marginRight: 4,
  },
  assignmentTime: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
  },
  deleteButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
  scrollViewContent: {
    flexGrow: 1, // Allow content to grow within ScrollView
  },
});

export default ScheduleGrid;