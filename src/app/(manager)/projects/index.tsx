import React, { useState, useContext, useMemo, useEffect } from "react";
import { View, StyleSheet, useWindowDimensions, TextInput, TouchableOpacity, Image, Platform, ActivityIndicator, Animated, ScrollView } from "react-native";
import { Text } from "~/components/Themed";
import { Card } from "~/components/Card";
import AnimatedScreen from "~/components/AnimatedScreen";
import { theme } from "~/theme";
import { useRouter } from "expo-router";
import { ProjectsContext, Project, ProjectsContextType } from "~/context/ProjectsContext";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "~/components/Button";
import { AssignmentsContext } from "~/context/AssignmentsContext";
import { CreateProjectModal } from "~/components/CreateProjectModal";
import CustomDropdown from "~/components/CustomDropdown";

interface DropdownOption {
  label: string;
  value: string;
}

const sortOptions: DropdownOption[] = [
  { label: 'Last Modified (Newest)', value: 'newest' },
  { label: 'Alphabetical (A-Z)', value: 'alphabetical' },
];

const statusFilterOptions: DropdownOption[] = [
  { label: 'Active', value: 'active' },
  { label: 'All Projects', value: 'all' },
  { label: 'Closed', value: 'closed' },
];

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

export default function ManagerProjects() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { projects, loadInitialProjects, isLoading: projectsLoading } = useContext(ProjectsContext) as ProjectsContextType;
  const { assignments } = useContext(AssignmentsContext)!;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [statusFilter, setStatusFilter] = useState<'active' | 'closed' | 'all'>('active');
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [gridWidth, setGridWidth] = useState(0);

  useEffect(() => {
    loadInitialProjects();
  }, [loadInitialProjects]);

  const getNumColumns = () => {
    if (width < 640) return 1; // Mobile
    if (width < 1024) return 2; // Tablet
    if (width < 1440) return 3; // Small Desktop
    return 4; // Desktop
  };

  const numColumns = getNumColumns();
  const gridGap = theme.spacing(2);
  const itemsPerPage = useMemo(() => {
    if (numColumns >= 4) return 12;
    if (numColumns === 3) return 9;
    if (numColumns === 2) return 8;
    return 6;
  }, [numColumns]);
  const projectCardWidth = useMemo(() => {
    if (gridWidth <= 0) return undefined;
    return Math.max(0, (gridWidth - gridGap * (numColumns - 1)) / numColumns);
  }, [gridWidth, gridGap, numColumns]);


  const getWorkerCountForProject = (projectId: string) => {
    const workerIds = new Set();
    assignments.forEach(assignment => {
      if (assignment.ref_id === projectId) { // Check ref_id
        workerIds.add(assignment.worker_id); // Use worker_id
      }
    });
    return workerIds.size;
  };

  const sortedAndFilteredProjects = useMemo(() => {
    let currentProjects = [...projects];

    if (searchTerm) {
      currentProjects = currentProjects.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      currentProjects = currentProjects.filter(project => project.status === statusFilter);
    }

    if (sortBy === 'newest') {
      currentProjects.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    } else if (sortBy === 'alphabetical') {
      currentProjects.sort((a, b) => a.name.localeCompare(b.name));
    }

    return currentProjects;
  }, [projects, searchTerm, sortBy, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, statusFilter, numColumns]);

  const totalPages = Math.max(1, Math.ceil(sortedAndFilteredProjects.length / itemsPerPage));
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAndFilteredProjects.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAndFilteredProjects, currentPage, itemsPerPage]);
  const gridStyle = useMemo(() => (
    Platform.OS === 'web'
      ? {
          display: 'grid',
          gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))`,
          columnGap: theme.spacing(2),
          rowGap: theme.spacing(2),
          alignContent: 'start',
        }
      : null
  ), [numColumns]);

  const handleProjectPress = (projectId: string) => {
    router.push(`/(manager)/projects/${projectId}`);
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    setModalVisible(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setModalVisible(true);
  };

  const ProjectCardItem = ({ item }: { item: Project }) => {
    const workerCount = getWorkerCountForProject(item.id as string);
    const cardWidthStyle = Platform.OS === 'web'
      ? ({ width: '100%' } as const)
      : (projectCardWidth ? { width: projectCardWidth } : null);

    return (
      <View style={[styles.cardContainer, cardWidthStyle]}>
        <TouchableOpacity 
          onPress={() => handleProjectPress(item.id)} 
          style={styles.projectCardWrapper}
        >
          <Animated.View style={styles.projectCard}>
            <TouchableOpacity
              onPress={(event) => {
                event.stopPropagation();
                handleEditProject(item);
              }}
              style={styles.editProjectButton}
            >
              <Ionicons name="pencil-outline" size={16} color={theme.colors.headingText} />
            </TouchableOpacity>
            {item.photos && item.photos.length > 0 ? (
              <Image source={{ uri: item.photos[0] }} style={styles.projectImage} resizeMode="cover" />
            ) : (
              <View style={[styles.projectImage, styles.imagePlaceholder]}>
                <Ionicons name="image-outline" size={50} color={theme.colors.borderColor} />
              </View>
            )}
            <View style={[styles.cardContent, { backgroundColor: theme.colors.cardBackground }]}>
              <View style={[styles.colorAccent, { backgroundColor: item.color || theme.colors.primary }]} />
              <Text style={styles.projectName} numberOfLines={2} fontType="regular">{item.name}</Text>
              <Text style={styles.projectAddress} numberOfLines={1} fontType="regular">{item.address}</Text>
              <View style={styles.cardFooter}>
                <View style={styles.footerStat}>
                  <Ionicons name="people-outline" size={16} color={theme.colors.bodyText} />
                  <Text style={styles.footerStatText} fontType="medium">{workerCount} {workerCount === 1 ? 'worker' : 'workers'}</Text>
                </View>
                <View style={styles.cardMeta}>
                  <Text style={[styles.statusPill, item.status === 'closed' ? styles.statusPillClosed : styles.statusPillActive]} fontType="medium">
                    {item.status === 'closed' ? 'Closed' : 'Active'}
                  </Text>
                  <Text style={styles.lastModified} fontType="medium">{new Date(item.lastModified).toLocaleDateString()}</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <AnimatedScreen>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle} fontType="bold">Projects</Text>
        <Text style={styles.pageSubtitle} fontType="regular">Manage your ongoing projects and assign workers.</Text>
      </View>
      <View style={styles.mainContentCard}>
        <View style={styles.headerControls}>
          <View style={styles.filterSortRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search projects..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor={theme.colors.bodyText}
            />
            <CustomDropdown
              data={sortOptions}
              value={sortBy}
              onChange={(item: DropdownOption) => setSortBy(item.value)}
              placeholder="Sort By"
              style={styles.dropdownSort}
            />
            <CustomDropdown
              data={statusFilterOptions}
              value={statusFilter}
              onChange={(item: DropdownOption) => setStatusFilter(item.value as 'active' | 'closed' | 'all')}
              placeholder="Status"
              style={styles.dropdownStatus}
            />
          </View>
          <Button title="Create Project" onPress={handleCreateProject} style={styles.createButton} textStyle={styles.createButtonText} />
        </View>

        <View
          style={styles.contentArea}
          onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
        >
          {projectsLoading && projects.length === 0 ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: theme.spacing(4) }} />
          ) : sortedAndFilteredProjects.length === 0 ? (
            <Text style={styles.noProjectsText} fontType="regular">No projects found matching your criteria.</Text>
          ) : (
            <>
              <ScrollView style={styles.projectsScrollView} contentContainerStyle={styles.projectsScrollContent}>
                <View style={[styles.grid, gridStyle as any]}>
                  {paginatedProjects.map((item) => (
                    <ProjectCardItem key={item.id} item={item} />
                  ))}
                </View>
              </ScrollView>

              {totalPages > 1 && (
                <View style={styles.paginationBar}>
                  <Text style={styles.paginationText} fontType="regular">
                    Page {currentPage} of {totalPages}
                  </Text>
                  <View style={styles.paginationActions}>
                    <Button
                      title="Previous"
                      onPress={() => setCurrentPage(page => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      type="secondary"
                      style={styles.paginationButton}
                      textStyle={styles.paginationButtonText}
                    />
                    <Button
                      title="Next"
                      onPress={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                      type="secondary"
                      style={styles.paginationButton}
                      textStyle={styles.paginationButtonText}
                    />
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </View>
      <CreateProjectModal
        visible={isModalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingProject(null);
        }}
        mode={editingProject ? 'edit' : 'create'}
        project={editingProject}
      />
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  // Removed container, scrollContentContainer, title styles
  pageHeader: {
    paddingVertical: theme.spacing(4),
    paddingHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.background,
    alignItems: 'flex-start',
  },
  pageTitle: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  pageSubtitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.bodyText,
  },
  mainContentCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(3), // Add padding within the card
    marginHorizontal: theme.spacing(2), // Match dashboard's column margin
    marginBottom: theme.spacing(2),
    overflow: 'visible',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        zIndex: 1,
      },
      native: {

      },
    }),
  },
  headerControls: {
    marginBottom: theme.spacing(3), // Increased margin for better separation
    flexDirection: 'row',
    justifyContent: 'space-between', // Aligned with employees.tsx
    alignItems: 'center',
    flexWrap: 'wrap', // Keep for responsiveness of controls
    zIndex: 20,
    overflow: 'visible',
  },
  filterSortRow: {
    flexDirection: 'row',
    alignItems: 'center', // Aligned with employees.tsx
    flexWrap: 'wrap', // Keep for responsiveness of controls
    zIndex: 30,
    overflow: 'visible',
    // Removed flex: 1 and marginBottom: theme.spacing(2) as it's handled by main headerControls
  },
  searchInput: {
    width: 250, // Adjusted width
    height: 40, // Adjusted height
    backgroundColor: theme.colors.pageBackground, // Lighter background
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    fontSize: theme.fontSizes.md, // Aligned with theme
    marginRight: theme.spacing(1.5), // Adjusted margin
    color: theme.colors.headingText,
    // Removed flex: 1 and minWidth: 180
  },
  dropdownSort: {
    width: 230,
    height: 40, // Adjusted height
    zIndex: 40,
    paddingHorizontal: theme.spacing(1),
  },
  dropdownStatus: {
    width: 180,
    height: 40,
    zIndex: 35,
    paddingHorizontal: theme.spacing(1),
  },
  createButton: {
    // Removed height: 45, Button component handles its own height
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    // Removed marginBottom: theme.spacing(2) as it's handled by main headerControls
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
  },
  grid: {
    width: '100%',
    ...Platform.select({
      native: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignContent: 'flex-start',
        gap: theme.spacing(2),
      },
    }),
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
    zIndex: 1,
  },
  projectsScrollView: {
    flex: 1,
  },
  projectsScrollContent: {
    paddingBottom: theme.spacing(1),
  },
  cardContainer: {
    ...(Platform.OS !== 'web' ? { marginBottom: theme.spacing(2) } : null),
  },
  projectCardWrapper: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.cardBackground, // Ensure a background color for shadow
    borderWidth: 1, // Added border
    borderColor: theme.colors.borderColor, // Added border color
    ...Platform.select({
      web: {
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0px 8px 15px rgba(0,0,0,0.07)`,
        },
      },
    }),
  },
  projectCard: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    flexDirection: 'column',
    minHeight: 230,
    position: 'relative',
  },
  editProjectButton: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    zIndex: 5,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectImage: {
    width: '100%',
    height: 100,
    backgroundColor: theme.colors.pageBackground,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: theme.spacing(2),
    flex: 1,
    position: 'relative',
    paddingLeft: theme.spacing(3), // Adjusted for symmetry with colorAccent
  },
  colorAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: theme.spacing(1),
  },
  projectName: {
    fontSize: theme.fontSizes.lg, // Adjusted
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  projectAddress: {
    fontSize: theme.fontSizes.sm, // Adjusted
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(1.5),
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
    paddingTop: theme.spacing(1.5),
    marginTop: 'auto', // Pushes footer to the bottom
  },
  cardMeta: {
    alignItems: 'flex-end',
    gap: theme.spacing(0.75),
  },
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerStatText: {
    marginLeft: theme.spacing(1),
    color: theme.colors.bodyText,
    fontSize: theme.fontSizes.sm, // Adjusted
  },
  lastModified: {
    fontSize: theme.fontSizes.sm, // Adjusted
    color: theme.colors.bodyText,
  },
  statusPill: {
    fontSize: theme.fontSizes.xs,
    paddingHorizontal: theme.spacing(1),
    paddingVertical: theme.spacing(0.5),
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  statusPillActive: {
    backgroundColor: theme.statusColors.successBackground,
    color: theme.statusColors.successText,
  },
  statusPillClosed: {
    backgroundColor: theme.colors.pageBackground,
    color: theme.colors.bodyText,
  },
  noProjectsText: {
    textAlign: 'center',
    fontSize: theme.fontSizes.md, // Adjusted
    color: theme.colors.bodyText,
    marginTop: theme.spacing(4),
  },
  paginationBar: {
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  paginationText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
  },
  paginationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  paginationButton: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
  },
  paginationButtonText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.headingText,
  },
});
