import React, { useState, useContext, useMemo, useEffect } from "react";
import { View, StyleSheet, useWindowDimensions, TextInput, TouchableOpacity, Platform, ActivityIndicator, ScrollView, Image } from "react-native";
import { Text } from "~/components/Themed";
import { Card } from "~/components/Card";
import AnimatedScreen from "~/components/AnimatedScreen";
import SubNavBar from "~/components/SubNavBar";
import { theme } from "~/theme";
import { useRouter } from "expo-router";
import { ProjectsContext, Project, ProjectsContextType } from "~/context/ProjectsContext";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "~/components/Button";
import { AssignmentsContext } from "~/context/AssignmentsContext";
import { CreateProjectModal } from "~/components/CreateProjectModal";
import CustomDropdown from "~/components/CustomDropdown";
import { useTranslation } from "react-i18next";

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

export default function ManagerProjects() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { t } = useTranslation();
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
    if (width < 640) return 1;
    if (width < 1024) return 2;
    if (width < 1440) return 3;
    return 4;
  };

  const numColumns = getNumColumns();
  const gridGap = theme.spacing(2);
  const itemsPerPage = useMemo(() => {
    if (numColumns >= 4) return 20;
    if (numColumns === 3) return 15;
    if (numColumns === 2) return 12;
    return 10;
  }, [numColumns]);


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
  const projectCardWidth = useMemo(() => {
    if (gridWidth <= 0) return undefined;
    return Math.max(0, (gridWidth - theme.spacing(2) * (numColumns - 1)) / numColumns);
  }, [gridWidth, numColumns]);

  const gridStyle = useMemo(() => (
    Platform.OS === 'web'
      ? {
          display: 'grid' as any,
          gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))`,
          gap: theme.spacing(2),
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
    const isActive = item.status !== 'closed';
    const cardWidthStyle = Platform.OS !== 'web' && projectCardWidth
      ? { width: projectCardWidth }
      : { width: '100%' as const };

    // Initials fallback: first letters of up to 2 words
    const initials = item.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0].toUpperCase())
      .join('');

    const hasPhoto = item.photos && item.photos.length > 0;

    return (
      <View style={[styles.cardOuter, cardWidthStyle]}>
        <TouchableOpacity
          onPress={() => handleProjectPress(item.id)}
          activeOpacity={0.75}
          style={styles.cardTouchable}
        >
          {/* Banner: photo or coloured initials fallback */}
          <View style={styles.cardBanner}>
            {hasPhoto ? (
              <Image
                source={{ uri: item.photos[0] }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.bannerFallback, { backgroundColor: item.color || theme.colors.primary }]}>
                <Text style={styles.bannerInitials} fontType="bold">{initials}</Text>
              </View>
            )}

            {/* Status pill — overlaid bottom-left on the banner */}
            <View style={[styles.statusPill, isActive ? styles.statusPillActive : styles.statusPillClosed]}>
              <Text style={[styles.statusPillText, isActive ? styles.statusPillTextActive : styles.statusPillTextClosed]} fontType="bold">
                {isActive ? t('manager.projects.statusActive') : t('manager.projects.statusClosed')}
              </Text>
            </View>

            {/* Edit button — overlaid top-right */}
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); handleEditProject(item); }}
              style={styles.editButton}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="pencil-outline" size={14} color="white" />
            </TouchableOpacity>
          </View>

          {/* Card body */}
          <View style={styles.cardBody}>
            {/* Colour dot + name row */}
            <View style={styles.nameRow}>
              <View style={[styles.colorDot, { backgroundColor: item.color || theme.colors.primary }]} />
              <Text style={styles.projectName} fontType="bold" numberOfLines={1}>{item.name}</Text>
            </View>

            {item.address ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={13} color={theme.colors.bodyText} />
                <Text style={styles.metaText} fontType="regular" numberOfLines={1}>{item.address}</Text>
              </View>
            ) : null}

            <View style={styles.cardFooter}>
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={13} color={theme.colors.bodyText} />
                <Text style={styles.metaText} fontType="regular">
                  {workerCount} {workerCount === 1 ? t('manager.projects.worker') : t('manager.projects.workers')}
                </Text>
              </View>
              <Text style={styles.lastModified} fontType="regular">
                {new Date(item.lastModified).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <SubNavBar items={[
        { label: 'Projects', href: '/(manager)/projects' },
        { label: 'Common Locations', href: '/(manager)/common-locations' },
        { label: 'Live Map', href: '/(manager)/map-overview' },
        { label: 'Location Replay', href: '/(manager)/location-replay' },
      ]} />
      <AnimatedScreen>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle} fontType="bold">{t('manager.projects.title')}</Text>
        <Text style={styles.pageSubtitle} fontType="regular">{t('manager.projects.subtitle')}</Text>
      </View>
      <View style={styles.mainContentCard}>
        <View style={styles.headerControls}>
          <View style={styles.filterSortRow}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('manager.projects.searchPlaceholder') as string}
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
          <Button title={t('manager.projects.createProject') as string} onPress={handleCreateProject} style={styles.createButton} textStyle={styles.createButtonText} />
        </View>

        <View style={styles.contentArea} onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
          {projectsLoading && projects.length === 0 ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: theme.spacing(4) }} />
          ) : sortedAndFilteredProjects.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color={theme.colors.borderColor} />
              <Text style={styles.emptyStateText} fontType="regular">{t('manager.projects.noProjects')}</Text>
            </View>
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
                    {t('manager.projects.pageOf', { current: currentPage, total: totalPages })}
                  </Text>
                  <View style={styles.paginationActions}>
                    <Button
                      title={t('manager.projects.previous') as string}
                      onPress={() => setCurrentPage(page => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      type="secondary"
                      style={styles.paginationButton}
                      textStyle={styles.paginationButtonText}
                    />
                    <Button
                      title={t('manager.projects.next') as string}
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
    </View>
  );
}

const styles = StyleSheet.create({
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
    padding: theme.spacing(3),
    marginHorizontal: theme.spacing(2),
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
    }),
  },
  headerControls: {
    marginBottom: theme.spacing(2),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    zIndex: 20,
    overflow: 'visible',
  },
  filterSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    zIndex: 30,
    overflow: 'visible',
    gap: theme.spacing(1.5),
  },
  searchInput: {
    width: 220,
    height: 40,
    backgroundColor: theme.colors.pageBackground,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  dropdownSort: {
    width: 210,
    height: 40,
    zIndex: 40,
    paddingHorizontal: theme.spacing(1),
  },
  dropdownStatus: {
    width: 160,
    height: 40,
    zIndex: 35,
    paddingHorizontal: theme.spacing(1),
  },
  createButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  createButtonText: {
    color: 'white',
    fontSize: theme.fontSizes.md,
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
  // --- Project grid card ---
  cardOuter: {
    ...Platform.select({ native: { marginBottom: theme.spacing(2) } }),
  },
  cardTouchable: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    backgroundColor: theme.colors.cardBackground,
    overflow: 'hidden',
    ...Platform.select({
      web: { cursor: 'pointer' } as any,
      native: { ...theme.shadow.soft },
    }),
  },
  // Banner area — photo or coloured fallback, fixed height
  cardBanner: {
    width: '100%',
    height: 130,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerInitials: {
    fontSize: 36,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 2,
  },
  // Status pill — bottom-left over banner
  statusPill: {
    position: 'absolute',
    bottom: theme.spacing(1),
    left: theme.spacing(1),
    paddingHorizontal: theme.spacing(1),
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  statusPillText: {
    fontSize: theme.fontSizes.xs,
  },
  statusPillActive: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  statusPillTextActive: {
    color: 'white',
  },
  statusPillClosed: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  statusPillTextClosed: {
    color: 'rgba(255,255,255,0.75)',
  },
  // Edit button — top-right over banner
  editButton: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Card body below banner
  cardBody: {
    padding: theme.spacing(1.5),
    gap: theme.spacing(0.75),
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: 2,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  projectName: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.borderColor,
    paddingTop: theme.spacing(0.75),
    marginTop: theme.spacing(0.25),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
  },
  lastModified: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.disabledText,
  },
  grid: {
    width: '100%',
    ...Platform.select({
      native: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing(2),
        alignContent: 'flex-start',
      },
    }),
  },
  // --- Empty state ---
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing(6),
    gap: theme.spacing(2),
  },
  emptyStateText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
    textAlign: 'center',
  },
  // --- Pagination ---
  paginationBar: {
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
