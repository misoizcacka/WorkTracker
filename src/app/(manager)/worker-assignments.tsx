import React, { useState, useCallback, useContext, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Image, TextInput, FlatList, ScrollView, ActivityIndicator } from 'react-native';
import moment from 'moment';
import { DragDropContext, DropResult, Droppable } from '@hello-pangea/dnd';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// NEW: Use new types for AssignmentsContext
import { Employee, Project, CommonLocation, AssignmentRecord, ProcessedAssignmentStep } from '~/types';
import { useAssignments } from '~/context/AssignmentsContext'; // NEW: AssignmentsContext
import ScheduleGrid from '~/components/ScheduleGrid';
import CrossPlatformDatePicker from '~/components/CrossPlatformDatePicker';
// NEW: AddAssignmentModal and SetAssignmentTimeModal are now used differently with AssignmentsContext
import AddAssignmentModal from '~/components/AddAssignmentModal';
import SetAssignmentTimeModal from '~/components/SetAssignmentTimeModal';
import { theme } from '~/theme';
import { EmployeesContext } from '~/context/EmployeesContext';
import { useProjects } from '~/context/ProjectsContext';
import DraggableProjectItem from '~/components/DraggableProjectItem';
import DraggableLocationItem from '~/components/DraggableLocationItem'; // NEW: For common locations
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '~/context/AuthContext'; // NEW: For user session
import Toast from 'react-native-toast-message'; // NEW: For toast messages
import { generateKeyBetween } from '~/utils/fractionalIndexing'; // NEW: For fractional indexing

// Helper component from old project-assignment.tsx
const CrossPlatformScrollContainer = React.forwardRef((props: any, ref) => {
    if (Platform.OS === 'web') {
      return <div ref={ref as any} {...props} style={{...props.style, overflowY: 'auto'}} />;
    } else {
      return <ScrollView ref={ref as any} {...props} scrollEventThrottle={400} />; // Add scrollEventThrottle for performance
    }
  });

export default function ProjectAssignmentScreen() {
  const { employees } = useContext(EmployeesContext)!;
  const { projects, isLoading: projectsLoading } = useProjects()!;
  const { user } = useSession()!; // NEW: From useSession

  // NEW: Use AssignmentsContext for data management
  const {
    processedAssignments,
    assignments, // Raw assignments from context
    commonLocations,
    loadAssignmentsForDate,
    clearAssignments,
    insertAssignmentStep,
    updateAssignmentSortKey,
    deleteAssignmentStep,
    moveAssignmentBetweenWorkers,
    isLoading: assignmentsLoading,
    updateAssignmentStartTime,
  } = useAssignments();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  // NEW: State for SetAssignmentTimeModal, uses editingStep
  const [isSetTimeModalVisible, setIsSetTimeModalVisible] = useState(false);
  const [editingStep, setEditingStep] = useState<{workerId: string, stepId: string, startTime: string | null} | null>(null);

  const [selectedWorkers, setSelectedWorkers] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermProject, setSearchTermProject] = useState('');
  const [searchTermLocation, setSearchTermLocation] = useState(''); // NEW: For common locations search

  // NEW: State for AddAssignmentModal
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [addingToWorkerId, setAddingToWorkerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'locations'>('projects'); // NEW: State for active tab

  const prevSelectedWorkersRef = useRef<Employee[]>([]);

  // NEW: Handle add assignment for modal
  const handleAddAssignment = (workerId: string) => {
    setAddingToWorkerId(workerId);
    setIsAddModalVisible(true);
  };

  const handleWorkerPress = (employee: Employee) => {
    setSelectedWorkers(prev =>
      prev.find(e => e.id === employee.id)
        ? prev.filter(e => e.id !== employee.id)
        : [...prev, employee]
    );
  };

  const filteredWorkers = employees.filter(employee =>
    employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    employee.role === 'worker' &&
    employee.id !== user?.id
  );

  const filteredProjects = React.useMemo(() => 
    projects.filter(project =>
      project.name.toLowerCase().includes(searchTermProject.toLowerCase())
    ), 
    [projects, searchTermProject]
  );
  
  // NEW: Filtered locations
  const filteredLocations = React.useMemo(() =>
      commonLocations.filter((location: CommonLocation) =>
          location.name.toLowerCase().includes(searchTermLocation.toLowerCase())
      ),
      [commonLocations, searchTermLocation]
  );

  // Effect for date changes (from current worker-assignments.tsx)
  useEffect(() => {
    clearAssignments();
    const workerIds = selectedWorkers.map(w => w.id);
    if (workerIds.length > 0) {
      const dateStr = moment(selectedDate).format('YYYY-MM-DD');
      loadAssignmentsForDate(dateStr, workerIds);
    }
  }, [selectedDate, clearAssignments, loadAssignmentsForDate, selectedWorkers.length]);

  // Effect for worker selection changes (from current worker-assignments.tsx)
  useEffect(() => {
    const dateStr = moment(selectedDate).format('YYYY-MM-DD');
    const newlySelectedWorkers = selectedWorkers.filter(
      sw => !prevSelectedWorkersRef.current.some((psw: Employee) => psw.id === sw.id)
    );

    const workerIdsToFetch = newlySelectedWorkers
      .map(w => w.id)
      .filter(id => !assignments.some((assign: AssignmentRecord) => assign.worker_id === id && assign.assigned_date === dateStr));

    if (workerIdsToFetch.length > 0) {
      loadAssignmentsForDate(dateStr, workerIdsToFetch);
    }
    
    prevSelectedWorkersRef.current = selectedWorkers;
  }, [selectedWorkers, assignments, selectedDate, loadAssignmentsForDate]);
  
  // renderWorkerItem (from old project-assignment.tsx, uses Image)
  const renderWorkerItem = ({ item }: { item: Employee }) => {
    const isSelected = selectedWorkers.some(e => e.id === item.id);
    const itemNameColor = isSelected ? theme.colors.primary : styles.itemName.color;
    const itemSubtitleColor = isSelected ? theme.colors.bodyText : styles.itemSubtitle.color; // Keep bodyText or adjust if needed
    const iconColor = isSelected ? theme.colors.primary : theme.colors.bodyText; // For person placeholder
    const checkmarkColor = isSelected ? theme.colors.primary : theme.colors.primary; // For checkmark icon

    return (
      <TouchableOpacity onPress={() => handleWorkerPress(item)} style={styles.listItem}>
        <View style={[styles.workerItemContent, isSelected && styles.selectedItem]}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <Ionicons name="person" size={40} color={iconColor} style={styles.avatarPlaceholder} />
          )}
          <View style={styles.workerInfo}>
            <Text style={[styles.itemName, { color: itemNameColor }]}>{item.full_name}</Text>
            <Text style={[styles.itemSubtitle, { color: itemSubtitleColor }]}>{item.email}</Text>
          </View>
          {isSelected && <Ionicons name="checkmark-circle" size={20} color={checkmarkColor} />}
        </View>
      </TouchableOpacity>
    );
  };

  // onDragEnd logic from current worker-assignments.tsx (using AssignmentsContext)
  const onDragEnd = useCallback(async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) {
      // Show toast only if dragging from sidebar and dropped outside
      if (source.droppableId === 'project-list' || source.droppableId === 'location-list') {
        Toast.show({ type: 'info', text1: 'Assignment Not Added', text2: 'Item was dropped outside any valid area.' });
      }
      return;
    }

    const assignedDateStr = moment(selectedDate).format('YYYY-MM-DD');
    const [draggedItemType, draggedItemRefId] = draggableId.split(/-(.*)/s); 

    const getWorkerAssignments = (workerId: string) => {
      return processedAssignments[workerId] || [];
    };

    const calculateNewSortKey = (destIndex: number, currentAssignments: (ProcessedAssignmentStep | AssignmentRecord)[]) => {
        const prevAssignment = destIndex > 0 ? currentAssignments[destIndex - 1] : null;
              console.log(`prevassignment = ${prevAssignment}`)
        const nextAssignment = destIndex < currentAssignments.length ? currentAssignments[destIndex] : null;
                      console.log(`next = ${nextAssignment}`)
        return generateKeyBetween(prevAssignment?.sort_key || null, nextAssignment?.sort_key || null);
    };

    // --- Dragging from a sidebar to a worker column (ADD NEW ASSIGNMENT) ---
    if ((source.droppableId === 'project-list' || source.droppableId === 'location-list') && destination.droppableId.startsWith('worker-')) {
      const workerId = destination.droppableId.replace('worker-', '');
      const currentWorkerAssignments = getWorkerAssignments(workerId);
      
      console.log(currentWorkerAssignments)
      if (currentWorkerAssignments.some((assign: ProcessedAssignmentStep) => assign.ref_id === draggedItemRefId)) { 
        Toast.show({ type: 'info', text1: 'Assignment Exists', text2: 'This item is already assigned to this worker on this day.' });
        return;
      }

      const newSortKey = calculateNewSortKey(destination.index, currentWorkerAssignments);

      try {
        await insertAssignmentStep({
          worker_id: workerId,
          assigned_date: assignedDateStr,
          sort_key: newSortKey,
          ref_id: draggedItemRefId,
          ref_type: draggedItemType as 'project' | 'common_location',
          start_time: null,
        });
        Toast.show({ type: 'success', text1: 'Assignment Added' });
      } catch (err: any) {
        Toast.show({ type: 'error', text1: 'Failed to Add Assignment', text2: err.message || 'An unexpected error occurred.' });
        console.error("Error adding assignment:", err);
      }
      return;
    }

    // --- Reordering within the same worker column (UPDATE SORT_KEY) ---
    if (source.droppableId === destination.droppableId && source.droppableId.startsWith('worker-')) {
      const workerId = source.droppableId.replace('worker-', '');
      const currentWorkerAssignments = getWorkerAssignments(workerId);
      
      const movedAssignment = currentWorkerAssignments.find((assign: ProcessedAssignmentStep) => assign.id === draggableId);
      if (!movedAssignment) return;

      const tempSequence = Array.from(currentWorkerAssignments);
      tempSequence.splice(source.index, 1); // Remove from source
      tempSequence.splice(destination.index, 0, movedAssignment); // Insert at destination (local simulation)

      const newSortKey = calculateNewSortKey(destination.index, tempSequence as (ProcessedAssignmentStep | AssignmentRecord)[]);

      try {
        await updateAssignmentSortKey(movedAssignment.id, newSortKey);
        Toast.show({ type: 'success', text1: 'Assignment Reordered' });
      } catch (err: any) {
        Toast.show({ type: 'error', text1: 'Failed to Reorder Assignment', text2: err.message || 'An unexpected error occurred.' });
        console.error("Error reordering assignment:", err);
      }
      return;
    }

    // --- Moving from one worker to another (UPDATE WORKER_ID & SORT_KEY) ---
    if (source.droppableId.startsWith('worker-') && destination.droppableId.startsWith('worker-')) {
      const sourceWorkerId = source.droppableId.replace('worker-', '');
      const destWorkerId = destination.droppableId.replace('worker-', '');
      
      const sourceWorkerAssignments = getWorkerAssignments(sourceWorkerId);
      const destWorkerAssignments = getWorkerAssignments(destWorkerId);

      const movedAssignment = sourceWorkerAssignments.find((assign: ProcessedAssignmentStep) => assign.id === draggableId);
      if (!movedAssignment) return;

      if (destWorkerAssignments.some((assign: ProcessedAssignmentStep) => assign.ref_id === movedAssignment.ref_id)) {
        Toast.show({ type: 'info', text1: 'Assignment Exists', text2: 'This item is already assigned to this worker on this day.' });
        return;
      }

      const newSortKey = calculateNewSortKey(destination.index, destWorkerAssignments);

      try {
        await moveAssignmentBetweenWorkers(movedAssignment.id, destWorkerId, newSortKey);
        Toast.show({ type: 'success', text1: 'Assignment Moved' });
      } catch (err: any) {
        Toast.show({ type: 'error', text1: 'Failed to Move Assignment', text2: err.message || 'An unexpected error occurred.' });
        console.error("Error moving assignment:", err);
      }
      return;
    }
  }, [selectedDate, processedAssignments, insertAssignmentStep, updateAssignmentSortKey, moveAssignmentBetweenWorkers]);

  const handleDeleteAssignment = useCallback(async (workerId: string, stepId: string) => {
    try {
      await deleteAssignmentStep(stepId);
      Toast.show({ type: 'success', text1: 'Assignment Deleted' });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Failed to Delete Assignment', text2: err.message || 'An unexpected error occurred.' });
      console.error("Error deleting assignment:", err);
    }
  }, [deleteAssignmentStep]);
  
  const handleEditAssignmentTime = useCallback(async (workerId: string, stepId: string, startTime: string | null) => {
    setEditingStep({ workerId, stepId, startTime });
    setIsSetTimeModalVisible(true);
  }, []);

  const handleSaveEditedAssignmentTime = useCallback(async (newStartTime: string | null) => {
      if (!editingStep) return;
      const { stepId } = editingStep;
      try {
        await updateAssignmentStartTime(stepId, newStartTime);
        Toast.show({ type: 'success', text1: 'Time Updated' });
      } catch (err: any) {
        Toast.show({ type: 'error', text1: 'Failed to Update Time', text2: err.message || 'An unexpected error occurred.' });
        console.error("Error updating assignment time:", err);
      } finally {
        setIsSetTimeModalVisible(false);
        setEditingStep(null);
      }
  }, [editingStep, updateAssignmentStartTime]);

  const isPastDate = moment(selectedDate).isBefore(moment(), 'day');

  return (
    <SafeAreaProvider>
      <DragDropContext onDragEnd={onDragEnd}>
        <View style={styles.container}>
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
                  employees={selectedWorkers}
                  assignments={processedAssignments}
                  selectedEmployees={selectedWorkers}
                  onDeleteAssignment={handleDeleteAssignment}
                  onEditAssignmentTime={handleEditAssignmentTime}
                  onAddAssignment={handleAddAssignment}
                  isPastDate={isPastDate}
                />
              )}
            </View>

            {/* Right Panel: Project and Location List */}
            <View style={styles.rightPanel}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'projects' && styles.activeTabButton]}
                        onPress={() => setActiveTab('projects')}
                    >
                        <Text style={[styles.tabButtonText, activeTab === 'projects' && styles.activeTabButtonText]}>Projects</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'locations' && styles.activeTabButton]}
                        onPress={() => setActiveTab('locations')}
                    >
                        <Text style={[styles.tabButtonText, activeTab === 'locations' && styles.activeTabButtonText]}>Locations</Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'projects' && (
                    <View style={styles.tabContent}>
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
                            {filteredProjects.map((project, index) => (
                              <DraggableProjectItem
                                  key={project.id}
                                  item={project}
                                  index={index}
                                  isSelected={false}
                                  onPress={() => {}}
                              />
                            ))}
                            {projectsLoading && <ActivityIndicator style={{ margin: 10 }} />}
                            {provided.placeholder}
                            </CrossPlatformScrollContainer>
                        )}
                        </Droppable>
                    </View>
                )}
                
                {activeTab === 'locations' && (
                    <View style={styles.tabContent}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search locations..."
                            value={searchTermLocation}
                            onChangeText={setSearchTermLocation}
                        />
                        <Droppable droppableId="location-list" type="TASK">
                        {(provided) => (
                            <CrossPlatformScrollContainer
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                style={{flex: 1}}
                            >
                            {filteredLocations.map((item: CommonLocation, index: number) => (
                            <DraggableLocationItem
                              key={item.id}
                              item={item}
                              index={index}
                            />
                            ))}
                            {assignmentsLoading && <ActivityIndicator style={{ margin: 10 }} />}
                            {provided.placeholder}
                            </CrossPlatformScrollContainer>
                        )}
                        </Droppable>
                    </View>
                )}
            </View>
          </View>
        </View>

        <SetAssignmentTimeModal
            isVisible={isSetTimeModalVisible}
            onClose={() => {
              setIsSetTimeModalVisible(false);
              setEditingStep(null);
            }}
            onSave={handleSaveEditedAssignmentTime}
            initialTime={editingStep?.startTime ?? null}
        />

        <AddAssignmentModal
          isVisible={isAddModalVisible}
          onClose={() => setIsAddModalVisible(false)}
          workerId={addingToWorkerId}
          assignedDate={moment(selectedDate).format('YYYY-MM-DD')}
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
    overflow: 'hidden', // Re-added overflow:hidden from old file (project-assignment.tsx)
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
  projectListContent: { // From old file (project-assignment.tsx)
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
  avatarPlaceholder: {
    width: 40,
    height: 40,
    marginRight: theme.spacing(2),
    textAlign: 'center',
    lineHeight: 40,
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
  tabContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing(2),
    backgroundColor: theme.colors.pageBackground,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    height: theme.spacing(6), // Fixed height for tabs
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: theme.colors.primary,
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.bodyText,
  },
  activeTabButtonText: {
    color: theme.colors.primary,
  },
  tabContent: {
    flex: 1,
  },
  addAssignmentButton: { // From old file (project-assignment.tsx)
    backgroundColor: theme.colors.primary,
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: theme.spacing(2),
  },
  addAssignmentButtonText: { // From old file (project-assignment.tsx)
    color: 'white',
    fontWeight: 'bold',
  },
  dragOverlay: { // From old file (project-assignment.tsx)
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    opacity: 0.9,
    ...theme.shadow.soft,
  },
  dragOverlayText: { // From old file (project-assignment.tsx)
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
  },
  assignmentDragOverlay: { // From old file (project-assignment.tsx)
    position: 'absolute',
    borderRadius: theme.radius.md,
    padding: theme.spacing(0.5),
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
    left: '5%',
  },
});
