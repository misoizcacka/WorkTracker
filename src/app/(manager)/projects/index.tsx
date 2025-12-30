import React, { useState, useContext, useMemo, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TextInput, TouchableOpacity, Image, Platform, ActivityIndicator, Animated } from "react-native";
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

export default function ManagerProjects() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { projects, loadInitialProjects, isLoading: projectsLoading } = useContext(ProjectsContext) as ProjectsContextType;
  const { assignments } = useContext(AssignmentsContext)!;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [isModalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadInitialProjects();
  }, [loadInitialProjects]);

  const getNumColumns = () => {
    if (width < 600) return 1;
    if (width < 1200) return 2;
    return 3;
  };

  const numColumns = getNumColumns();
  const cardWidth = useMemo(() => {
    const totalHorizontalPadding = theme.spacing(1) * 2;
    const gutter = theme.spacing(2);
    const containerPadding = theme.spacing(3) * 2;

    const availableWidth = width - containerPadding;
    const itemWidth = (availableWidth - (gutter * (numColumns - 1))) / numColumns;
    
    return itemWidth;
  }, [width, numColumns]);


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

    if (sortBy === 'newest') {
      currentProjects.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    } else if (sortBy === 'alphabetical') {
      currentProjects.sort((a, b) => a.name.localeCompare(b.name));
    }

    return currentProjects;
  }, [projects, searchTerm, sortBy]);

  const handleProjectPress = (projectId: string) => {
    router.push(`/(manager)/projects/${projectId}`);
  };

  const handleCreateProject = () => {
    setModalVisible(true);
  };

  const ProjectCardItem = ({ item }: { item: Project }) => {
    const workerCount = getWorkerCountForProject(item.id as string);

    return (
      <View style={[styles.cardContainer, { width: cardWidth }]}>
        <TouchableOpacity 
          onPress={() => handleProjectPress(item.id)} 
          style={styles.projectCardWrapper}
        >
          <Animated.View style={[
            styles.projectCard,
            { borderLeftColor: item.color || theme.colors.primary },
          ]}>
            {item.photos && item.photos.length > 0 ? (
              <Image source={{ uri: item.photos[0] }} style={styles.projectImage} resizeMode="cover" />
            ) : (
              <View style={[styles.projectImage, styles.imagePlaceholder]}>
                <Ionicons name="image-outline" size={50} color={theme.colors.borderColor} />
              </View>
            )}
            <View style={styles.cardContent}>
              <Text style={styles.projectName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.projectAddress} numberOfLines={1}>{item.address}</Text>        
              <View style={styles.cardFooter}>
                <View style={styles.footerStat}>
                  <Ionicons name="people-outline" size={16} color={theme.colors.bodyText} />     
                  <Text style={styles.footerStatText}>{workerCount}</Text>
                </View>
                <Text style={styles.lastModified}>{new Date(item.lastModified).toLocaleDateString()}</Text>
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <AnimatedScreen>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContentContainer}
        scrollEventThrottle={400}
      >
        <Text style={styles.title}>Projects</Text>
        
        <View style={styles.headerControls}>
          <View style={styles.filterSortRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search projects..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#999"
            />
            <CustomDropdown
              data={sortOptions}
              value={sortBy}
              onChange={(item: DropdownOption) => setSortBy(item.value)}
              placeholder="Sort By"
              style={styles.dropdownSort}
            />
          </View>
          <Button title="Create Project" onPress={handleCreateProject} style={styles.createButton} />
        </View>

        {projectsLoading && projects.length === 0 ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: theme.spacing(4) }} />
        ) : sortedAndFilteredProjects.length === 0 ? (
          <Text style={styles.noProjectsText}>No projects found matching your criteria.</Text>
        ) : (
          <View style={styles.grid}>
            {sortedAndFilteredProjects.map((item) => (
              <ProjectCardItem key={item.id} item={item} />
            ))}
          </View>
        )}
      </ScrollView>
      <CreateProjectModal visible={isModalVisible} onClose={() => setModalVisible(false)} />     
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  scrollContentContainer: {
    padding: theme.spacing(3),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    marginBottom: theme.spacing(3),
  },
  headerControls: {
    marginBottom: theme.spacing(3),
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterSortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing(2),
    flex: 1,
  },
  searchInput: {
    flex: 1,
    minWidth: 180,
    height: 45,
    backgroundColor: theme.colors.cardBackground,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    fontSize: 16,
    marginRight: theme.spacing(2),
    color: theme.colors.headingText,
  },
  dropdownSort: {
    width: 180,
    zIndex: 10,
  },
  createButton: {
    height: 45,
    paddingHorizontal: theme.spacing(3),
    marginBottom: theme.spacing(2),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing(1),
  },
  cardContainer: {
    paddingHorizontal: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  projectCardWrapper: {
    borderRadius: theme.radius.lg,
    ...theme.shadow.soft,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        transitionDuration: '0.2s',
        transitionProperty: 'transform, box-shadow',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: `0px 4px 10px rgba(0,0,0,0.1)`,
        },
      },
    }),
  },
  projectCard: {
    backgroundColor: theme.colors.cardBackground,
    flexDirection: 'column',
    borderLeftWidth: theme.spacing(1),
    paddingBottom: 0,
    minHeight: 280,
  },
  projectImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: theme.radius.md,
    borderTopRightRadius: theme.radius.md,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
  },
  cardContent: {
    padding: theme.spacing(2),
    flex: 1,
  },
  projectName: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  projectAddress: {
    fontSize: 14,
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
    marginTop: 'auto',
  },
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerStatText: {
    marginLeft: theme.spacing(1),
    color: theme.colors.bodyText,
    fontSize: 14,
  },
  lastModified: {
    fontSize: 12,
    color: theme.colors.bodyText,
  },
  noProjectsText: {
    textAlign: 'center',
    fontSize: 16,
    color: theme.colors.bodyText,
    marginTop: theme.spacing(4),
  },
});
