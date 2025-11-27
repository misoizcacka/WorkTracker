import React, { useState, useCallback, useContext, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Image, TextInput, FlatList, ScrollView } from 'react-native';
import moment from 'moment';
import { DragDropContext, DropResult, Droppable } from '@hello-pangea/dnd';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { mockAssignments } from './project-assignment-assets/mockData';
import { Worker } from '../../types';

import { Assignment } from './project-assignment-assets/types';
import { generateId } from './project-assignment-assets/utils/generateId';
import ScheduleGrid from './project-assignment-assets/ScheduleGrid'; // Import new component
import CrossPlatformDatePicker from '../../components/CrossPlatformDatePicker';
import AddAssignmentModal from './project-assignment-assets/AddAssignmentModal'; // Import AddAssignmentModal
import SetAssignmentTimeModal from './project-assignment-assets/SetAssignmentTimeModal'; // Import SetAssignmentTimeModal
import { hasConflict } from './project-assignment-assets/utils/conflict'; // Import hasConflict
import { calculateStackedAssignments } from './project-assignment-assets/utils/time';
import { theme } from '../../theme';
import { WorkersContext } from './WorkersContext';

import { ProjectsContext, Project } from './ProjectsContext';
import DraggableProjectItem from './project-assignment-assets/DraggableProjectItem';
import { Ionicons } from '@expo/vector-icons';


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

const CrossPlatformScrollContainer = React.forwardRef((props: any, ref) => {
    if (Platform.OS === 'web') {
      return <div ref={ref as any} {...props} style={{...props.style, overflowY: 'auto'}} />;
    } else {
      return <ScrollView ref={ref as any} {...props} />;
    }
  });

export default function ProjectAssignmentScreen() {
  const { workers } = useContext(WorkersContext)!;
  const { projects } = useContext(ProjectsContext)!;
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [assignments, setAssignments] = useState<Assignment[]>(mockAssignments);
  const [isAddAssignmentModalVisible, setAddAssignmentModalVisible] = useState(false); // State for modal visibility
  const [initialDroppedProject, setInitialDroppedProject] = useState<Project | undefined>(undefined);
  const [initialDroppedWorker, setInitialDroppedWorker] = useState<Worker | undefined>(undefined);

  // State for SetAssignmentTimeModal when editing existing assignments
  const [isSetTimeModalVisible, setIsSetTimeModalVisible] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [initialAssignedTime, setInitialAssignedTime] = useState<string | null>(null);

  

  const [selectedWorkers, setSelectedWorkers] = useState<Worker[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
  const [searchTermProject, setSearchTermProject] = useState('');


  const handleWorkerPress = (worker: Worker) => {
    setSelectedWorkers(prev =>
      prev.find(w => w.id === worker.id)
        ? prev.filter(w => w.id !== worker.id)
        : [...prev, worker]
    );
  };

  const handleProjectPress = (project: Project) => {
    setSelectedProjects(prev =>
      prev.find(p => p.id === project.id)
        ? prev.filter(p => p.id !== project.id)
        : [...prev, project]
    );
  };

  const filteredWorkers = workers.filter(worker =>
    worker.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProjects = React.useMemo(() => 
    projects.filter(project =>
      project.name.toLowerCase().includes(searchTermProject.toLowerCase())
    ), 
    [projects, searchTermProject]
  );

  const [displayProjects, setDisplayProjects] = useState<Project[]>([]);

  useEffect(() => {
    setDisplayProjects(filteredProjects);
  }, [filteredProjects]);

  const renderWorkerItem = ({ item }: { item: Worker }) => {
    const isSelected = selectedWorkers.some(w => w.id === item.id); // Use some for clarity
    return (
      <TouchableOpacity onPress={() => handleWorkerPress(item)} style={styles.listItem}>
        <View style={[styles.workerItemContent, isSelected && styles.selectedItem]}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          <View style={styles.workerInfo}>
            <Text style={styles.itemName}>{item.full_name}</Text>
            <Text style={styles.itemSubtitle}>{item.email}</Text>
          </View>
          {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
        </View>
      </TouchableOpacity>
    );
  };

  const handleAssignmentUpdated = useCallback((updatedAssignment: Assignment) => {
    setAssignments((prevAssignments) =>
      prevAssignments.map((assignment) =>
        assignment.id === updatedAssignment.id ? updatedAssignment : assignment
      )
    );
  }, []);

  const handleDeleteAssignment = useCallback((assignmentId: string) => {
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
  }, []);

  

  const handleCopyAssignments = useCallback((sourceWorkerId: string, targetWorkerId: string) => {
    setAssignments(prevAssignments => {
        const sourceAssignments = prevAssignments.filter(
            a => a.workerId === sourceWorkerId && moment(a.startDate).isSame(selectedDate, 'day')
        ).sort((a, b) => moment(a.startDate).diff(moment(b.startDate)));

        const targetAssignmentsForDay = prevAssignments.filter(
            a => a.workerId === targetWorkerId && moment(a.startDate).isSame(selectedDate, 'day')
        ).sort((a, b) => moment(a.startDate).diff(moment(b.startDate)));

        let currentMomentForTarget = targetAssignmentsForDay.length > 0
            ? moment(targetAssignmentsForDay[targetAssignmentsForDay.length - 1].endDate)
            : moment(selectedDate).startOf('day').add(9, 'hours'); // Default start time if no existing assignments

        const newAssignments: Assignment[] = [];

        sourceAssignments.forEach(sourceAssignment => {
            // Only copy if the project is not already assigned to the target worker on this day
            if (!targetAssignmentsForDay.some(ta => ta.projectId === sourceAssignment.projectId) &&
                !newAssignments.some(na => na.projectId === sourceAssignment.projectId)) {
                
                const durationMinutes = moment(sourceAssignment.endDate).diff(moment(sourceAssignment.startDate), 'minutes');
                const newStartDate = currentMomentForTarget.toDate();
                const newEndDate = moment(newStartDate).add(durationMinutes, 'minutes').toDate();

                newAssignments.push({
                    ...sourceAssignment,
                    id: generateId(),
                    workerId: targetWorkerId,
                    startDate: newStartDate,
                    endDate: newEndDate,
                });
                currentMomentForTarget = moment(newEndDate);
            }
        });

        if (newAssignments.length > 0) {
            // Combine existing target assignments with new ones and re-stack all of them
            const allTargetAssignments = [...targetAssignmentsForDay, ...newAssignments];
            const baseStartTime = targetAssignmentsForDay.length > 0
                ? targetAssignmentsForDay[0].startDate
                : newAssignments[0].startDate; // Use the first new assignment's start date if no existing

            const reStackedTargetAssignments = calculateStackedAssignments(allTargetAssignments, baseStartTime);

            return [
                ...prevAssignments.filter(a => a.workerId !== targetWorkerId || !moment(a.startDate).isSame(selectedDate, 'day')),
                ...reStackedTargetAssignments,
            ];
        }

        return prevAssignments;
    });
}, [selectedDate]);


  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // 1. Drop was outside any droppable area
    if (!destination) {
      return;
    }

    const sourceDroppableId = source.droppableId;
    const destDroppableId = destination.droppableId;

    // 2. Moving a project from the list to a worker lane
    if (sourceDroppableId === 'project-list' && destDroppableId.startsWith('worker-')) {
      const workerId = destDroppableId.replace('worker-', '');
      const projectId = draggableId.replace('project-', '');

      const droppedProject = projects.find(p => p.id === projectId);
      if (!droppedProject) return;

      setAssignments(prevAssignments => {
        const workerAssignments = prevAssignments
          .filter(a => a.workerId === workerId && moment(a.startDate).isSame(selectedDate, 'day'))
          .sort((a, b) => moment(a.startDate).diff(moment(b.startDate)));

        let newAssignmentStartDate: Date;
        let newAssignmentEndDate: Date;

        // If no specific time, calculate based on existing assignments or default to 9 AM
        const lastAssignmentEndTime = workerAssignments.length > 0
          ? moment(workerAssignments[workerAssignments.length - 1].endDate)
          : moment(selectedDate).startOf('day').add(9, 'hours');
        
        newAssignmentStartDate = lastAssignmentEndTime.toDate();
        newAssignmentEndDate = moment(newAssignmentStartDate).add(1, 'hour').toDate(); // Default 1 hour duration

        const newAssignment: Assignment = {
          id: generateId(),
          projectId: projectId,
          workerId: workerId,
          startDate: newAssignmentStartDate,
          endDate: newAssignmentEndDate,
          assignedTime: null, // No specific time on initial drop
        } as Assignment; // Explicitly cast to Assignment

        // Insert the new assignment at the drop location
        workerAssignments.splice(destination.index, 0, newAssignment);

        const baseStartTime = moment(selectedDate).startOf('day').add(9, 'hours').toDate();

        const reStackedAssignments = calculateStackedAssignments(workerAssignments, baseStartTime);
        
        const otherDayAssignments = prevAssignments.filter(a => !(a.workerId === workerId && moment(a.startDate).isSame(selectedDate, 'day')));
        
        return [...otherDayAssignments, ...reStackedAssignments];
      });
      return;
    }

    // 3. Reordering an assignment within the same worker lane
    if (sourceDroppableId.startsWith('worker-') && sourceDroppableId === destDroppableId) {
      const workerId = sourceDroppableId.replace('worker-', '');
      
      setAssignments(prevAssignments => {
        const workerAssignments = prevAssignments
            .filter(a => a.workerId === workerId && moment(a.startDate).isSame(selectedDate, 'day'))
            .sort((a, b) => moment(a.startDate).diff(moment(b.startDate)));
        
        const [movedItem] = workerAssignments.splice(source.index, 1);
        workerAssignments.splice(destination.index, 0, movedItem);

        const baseStartTime = moment(selectedDate).startOf('day').add(9, 'hours').toDate();
        const reStackedAssignments = calculateStackedAssignments(workerAssignments, baseStartTime);

        const otherDayAssignments = prevAssignments.filter(a => !(a.workerId === workerId && moment(a.startDate).isSame(selectedDate, 'day')));
        
        return [...otherDayAssignments, ...reStackedAssignments];
      });
      return;
    }

    // All other drags (e.g., assignment to another worker) are ignored.
  };

  const handleAddAssignment = useCallback((newAssignment: Assignment) => {
    console.log("handleAddAssignment called with:", newAssignment);
    setAssignments((prevAssignments) => {
      console.log("Current assignments count:", prevAssignments.length);
      const workerAssignmentsForDay = prevAssignments.filter(
        a => a.workerId === newAssignment.workerId && moment(a.startDate).isSame(newAssignment.startDate, 'day')
      ).sort((a, b) => moment(a.startDate).diff(moment(b.startDate)));

      // Check for conflict with the new assignment before adding
      if (hasConflict(newAssignment, workerAssignmentsForDay)) {
        console.warn('Conflict detected! Cannot add assignment via modal.');
        return prevAssignments;
      }

      const allAssignmentsForWorker = [...workerAssignmentsForDay, newAssignment];

      // Determine the base start time for stacking. If it's the first assignment, use its own start time.
      // Otherwise, use the start time of the first existing assignment.
      const baseStartTime = workerAssignmentsForDay.length === 0
        ? newAssignment.startDate
        : workerAssignmentsForDay[0].startDate;

      const reStackedAssignments = calculateStackedAssignments(allAssignmentsForWorker, baseStartTime);

      const result = [
        ...prevAssignments.filter(a => a.workerId !== newAssignment.workerId || !moment(newAssignment.startDate).isSame(newAssignment.startDate, 'day')),
        ...reStackedAssignments,
      ];
      console.log("New assignments count:", result.length);
      return result;
    });
  }, []);


  const handleSaveEditedAssignmentTime = useCallback((newAssignedTime: string | null, assignmentId?: string | null) => {
    if (!assignmentId) return;

    setAssignments(prevAssignments => {
      const updatedAssignments = prevAssignments.map(assignment => {
        if (assignment.id === assignmentId) {
          let newStartDate = assignment.startDate;
          let newEndDate = assignment.endDate;

          // If a new assigned time is provided, update start and end dates
          if (newAssignedTime) {
            const [hours, minutes] = newAssignedTime.split(':').map(Number);
            newStartDate = moment(assignment.startDate).set({ hour: hours, minute: minutes, second: 0, millisecond: 0 }).toDate();
            // Maintain original duration or set a default if duration is not relevant
            const durationMinutes = moment(assignment.endDate).diff(moment(assignment.startDate), 'minutes');
            newEndDate = moment(newStartDate).add(durationMinutes, 'minutes').toDate();
          } else {
            // If assigned time is removed, revert to stacking logic.
            // For simplicity here, we'll just set assignedTime to null and re-stack later.
            // A more complex logic might recalculate startDate based on previous assignment immediately.
            // For now, setting to null and relying on re-stacking during display or next re-arrangement.
            newStartDate = moment(assignment.startDate).startOf('day').add(9, 'hours').toDate(); // Default to 9 AM
            newEndDate = moment(newStartDate).add(1, 'hour').toDate(); // Default 1 hour duration
          }

          return {
            ...assignment,
            startDate: newStartDate,
            endDate: newEndDate,
            assignedTime: newAssignedTime,
          } as Assignment; // Explicitly cast to Assignment
        }
        return assignment;
      });

      // After updating, re-stack assignments for the worker whose assignment was edited
      const editedAssignment = updatedAssignments.find(a => a.id === assignmentId);
      if (editedAssignment) {
        const workerAssignmentsForDay = updatedAssignments
          .filter(a => a.workerId === editedAssignment.workerId && moment(a.startDate).isSame(selectedDate, 'day'))
          .sort((a, b) => moment(a.startDate).diff(moment(b.startDate)));

        const baseStartTime = moment(selectedDate).startOf('day').add(9, 'hours').toDate();
        const reStackedAssignments = calculateStackedAssignments(workerAssignmentsForDay, baseStartTime);

        const otherDayAssignments = updatedAssignments.filter(a => !(a.workerId === editedAssignment.workerId && moment(a.startDate).isSame(selectedDate, 'day')));
        
        return [...otherDayAssignments, ...reStackedAssignments];
      }

      return updatedAssignments;
    });

    setIsSetTimeModalVisible(false);
    setEditingAssignmentId(null);
    setInitialAssignedTime(null);
  }, [selectedDate]);

  const handleEditAssignmentTime = useCallback((assignmentId: string, assignedTime: string | null) => {
    setEditingAssignmentId(assignmentId);
    setInitialAssignedTime(assignedTime);
    setIsSetTimeModalVisible(true);
  }, []);

  const isPastDate = useMemo(() => moment(selectedDate).isBefore(moment(), 'day'), [selectedDate]);

  return (
    <SafeAreaProvider>
      <DragDropContext onDragEnd={onDragEnd}>
        <View style={styles.container}>
          <Text style={styles.title}>Project Assignment</Text>

          <View style={styles.topControls}>
            <View style={styles.dateNavigation}>
              <TouchableOpacity style={styles.dateNavButton} onPress={() => setSelectedDate(moment(selectedDate).subtract(1, 'day').toDate())}>
                <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <View style={styles.datePickerContainer}>
                <CrossPlatformDatePicker date={selectedDate} onDateChange={setSelectedDate} />
              </View>
              <TouchableOpacity style={styles.dateNavButton} onPress={() => setSelectedDate(moment(selectedDate).add(1, 'day').toDate())}>
                <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.mainLayout}>
            {/* Left Panel: Worker List */}
            <View style={styles.leftPanel}>
              <Text style={styles.panelTitle}>Workers</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search workers..."
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              <FlatList
                data={filteredWorkers}
                renderItem={renderWorkerItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.workerListContent}
              />
            </View>

            {/* Center Panel: Schedule Grid */}
            <View style={styles.centerPanel}>
              {selectedWorkers.length === 0 ? (
                <View style={styles.noWorkerSelectedContainer}>
                  <Text style={styles.noWorkerSelectedText}>Please select a worker to view their schedule.</Text>
                </View>
              ) : (
                <ScheduleGrid
                  workers={selectedWorkers}
                  projects={projects}
                  assignments={assignments}
                  selectedDate={selectedDate}
                  selectedWorkers={selectedWorkers}
                  onCopyAssignments={handleCopyAssignments}
                  onDeleteAssignment={handleDeleteAssignment}
                  onEditAssignmentTime={handleEditAssignmentTime}
                  isPastDate={isPastDate}
                />
              )}
            </View>

            {/* Right Panel: Project List */}

            <View style={styles.rightPanel}>
                <Text style={styles.panelTitle}>Projects</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search projects..."
                    value={searchTermProject}
                    onChangeText={setSearchTermProject}
                />
                <Droppable droppableId="project-list" type="TASK">
                  {(provided) => (
                    <CrossPlatformScrollContainer
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{flex: 1}}
                    >
                        {displayProjects.map((item, index) => {
                            const isSelected = selectedProjects.some(p => p.id === item.id);
                            return (
                                <DraggableProjectItem
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    isSelected={isSelected}
                                    onPress={handleProjectPress}
                                />
                            );
                        })}
                        {provided.placeholder}
                    </CrossPlatformScrollContainer>
                  )}
                </Droppable>
                <TouchableOpacity style={styles.addAssignmentButton} onPress={() => setAddAssignmentModalVisible(true)}>
                    <Text style={styles.addAssignmentButtonText}>Add Assignment</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
        <AddAssignmentModal
            isVisible={isAddAssignmentModalVisible}
            onClose={() => {
              setAddAssignmentModalVisible(false);
              setInitialDroppedProject(undefined);
              setInitialDroppedWorker(undefined);
            }}
            workers={workers}
            projects={projects}
            selectedDate={selectedDate}
            onSave={handleAddAssignment}
            initialProject={initialDroppedProject}
            initialWorker={initialDroppedWorker}
        />

        <SetAssignmentTimeModal
            isVisible={isSetTimeModalVisible}
            onClose={() => {
              setIsSetTimeModalVisible(false);
              setEditingAssignmentId(null);
              setInitialAssignedTime(null);
            }}
            onSave={handleSaveEditedAssignmentTime}
            assignmentId={editingAssignmentId}
            initialTime={initialAssignedTime}
        />
      </DragDropContext>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing(2),
    backgroundColor: theme.colors.pageBackground,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: theme.spacing(2),
    textAlign: 'center',
    color: theme.colors.headingText,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1),
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    ...theme.shadow.soft,
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeToggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.bodyText,
    marginHorizontal: theme.spacing(1.5),
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  datePickerContainer: {
    marginHorizontal: theme.spacing(1.5),
    position: 'relative',
    zIndex: 100, // Ensure date picker is on top
  },
  dateNavButton: {
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.lg,
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.cardBackground,
    ...theme.shadow.soft,
  },
  leftPanel: {
    width: 280,
    backgroundColor: theme.colors.cardBackground,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(2),
  },
  centerPanel: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  rightPanel: {
    width: 280,
    backgroundColor: theme.colors.cardBackground,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(2),
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
  },
  searchInput: {
    height: theme.spacing(5),
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(2),
    backgroundColor: theme.colors.pageBackground,
    color: theme.colors.headingText,
  },
  workerListContent: {
    paddingBottom: theme.spacing(2),
  },
  projectListContent: {
    paddingBottom: theme.spacing(2),
  },
  listItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.borderColor,
  },
  workerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
  },
  selectedItem: {
    backgroundColor: theme.colors.primaryMuted,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: theme.spacing(2),
  },
  workerInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: '500',
    color: theme.colors.headingText,
  },
  itemSubtitle: {
    fontSize: 12,
    color: theme.colors.bodyText,
  },
  noWorkerSelectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noWorkerSelectedText: {
    fontSize: 18,
    color: theme.colors.bodyText,
    textAlign: 'center',
  },
  addAssignmentButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: theme.spacing(2),
  },
  addAssignmentButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  dragOverlay: {
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    opacity: 0.9,
    ...theme.shadow.soft,
  },
  dragOverlayText: {
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
  },
  assignmentDragOverlay: {
    position: 'absolute',
    borderRadius: theme.radius.md,
    padding: theme.spacing(0.5),
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
    left: '5%',
  },
});