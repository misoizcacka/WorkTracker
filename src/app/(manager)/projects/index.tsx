import React, { useState, useContext, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TextInput, TouchableOpacity, Image, Platform, Animated } from "react-native";
import { Card } from "../../../components/Card"; // Assuming Card is still used or adapted
import AnimatedScreen from "../../../components/AnimatedScreen";
import { theme } from "../../../theme";
import { useRouter } from "expo-router";
import { ProjectsContext, Project } from "../ProjectsContext"; // Import Project type
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../../components/Button";
import { AssignmentsContext } from "../AssignmentsContext";
import { CreateProjectModal } from "../../../components/CreateProjectModal"; // Corrected import
import CustomDropdown from "../../../components/CustomDropdown";

interface DropdownOption {
  label: string;
  value: string;
}

// typeOptions removed
const sortOptions: DropdownOption[] = [
  { label: 'Last Modified (Newest)', value: 'newest' },
  { label: 'Alphabetical (A-Z)', value: 'alphabetical' },
];

export default function ManagerProjects() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { projects } = useContext(ProjectsContext)!;
  const { assignments } = useContext(AssignmentsContext)!;
  
  const [searchTerm, setSearchTerm] = useState('');
  // selectedType removed
  const [sortBy, setSortBy] = useState('newest'); // priority and type removed
  const [isModalVisible, setModalVisible] = useState(false);

  const getNumColumns = () => {
    if (width < 600) return 1; // Mobile
    if (width < 1200) return 2; // Tablet
    return 3; // Desktop
  };

  const numColumns = getNumColumns();
  const cardWidth = useMemo(() => {
    // Calculate card width based on number of columns and spacing
    const totalHorizontalPadding = theme.spacing(1) * 2; // Padding for cards themselves
    const gutter = theme.spacing(2); // Spacing between cards (half of this on each side)
    const containerPadding = theme.spacing(3) * 2; // ScrollContentContainer padding

    const availableWidth = width - containerPadding;
    const itemWidth = (availableWidth - (gutter * (numColumns - 1))) / numColumns;
    
    return itemWidth;
  }, [width, numColumns]);


  const getWorkerCountForProject = (projectId: string) => {
    const workerIds = new Set();
    assignments.forEach(assignment => {
      if (assignment.projectId === projectId) {
        workerIds.add(assignment.workerId);
      }
    });
    return workerIds.size;
  };

  const sortedAndFilteredProjects = useMemo(() => {
    let currentProjects = [...projects];

    // Filter by search term
    if (searchTerm) {
      currentProjects = currentProjects.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type removed
    // Filter by priority removed

    // Sort
    if (sortBy === 'newest') {
      currentProjects.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    } else if (sortBy === 'alphabetical') {
      currentProjects.sort((a, b) => a.name.localeCompare(b.name));
    }

    return currentProjects;
  }, [projects, searchTerm, sortBy]); // selectedType and selectedPriority removed

  const handleProjectPress = (projectId: string) => {
    router.push(`/(manager)/projects/${projectId}`);
  };

  const handleCreateProject = () => {
    setModalVisible(true);
  };

  const ProjectCardItem = ({ item }: { item: Project }) => {
    const workerCount = getWorkerCountForProject(item.id as string);
    // Removed isHovered state and onHoverIn/onHoverOut props

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
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
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
            {/* Type dropdown removed */}
            {/* Priority dropdown removed */}
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

        <View style={styles.grid}>
          {sortedAndFilteredProjects.map((item) => (
            <ProjectCardItem key={item.id} item={item} />
          ))}
        </View>
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
    flex: 1, // Allow filters to take available space
  },
  searchInput: {
    flex: 1,
    minWidth: 180, // Minimum width for search input
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
  dropdownFilter: {
    width: 150, // Fixed width for filter dropdowns
    marginRight: theme.spacing(2),
    marginBottom: theme.spacing(2), // For wrapping on smaller screens
    zIndex: 10, // Ensure dropdowns appear above content
  },
  dropdownSort: {
    width: 180, // Fixed width for sort dropdown
    zIndex: 10, // Ensure dropdowns appear above content
  },
  createButton: {
    height: 45,
    paddingHorizontal: theme.spacing(3),
    marginBottom: theme.spacing(2), // Align with filters if they wrap
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing(1), // Counteract cardContainer padding
  },
  cardContainer: {
    paddingHorizontal: theme.spacing(1), // Space between cards
    marginBottom: theme.spacing(2),
  },
  projectCardWrapper: {
    borderRadius: theme.radius.lg,
    ...theme.shadow.soft,
    overflow: 'hidden', // Ensures rounded corners and shadow apply correctly
    ...Platform.select({
      web: {
        transitionDuration: '0.2s',
        transitionProperty: 'transform, box-shadow',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: `0px 4px 10px rgba(0,0,0,0.1)`, // A bit more pronounced shadow on hover
        },
      },
    }),
  },
  projectCard: {
    backgroundColor: theme.colors.cardBackground,
    flexDirection: 'column',
    borderLeftWidth: theme.spacing(1), // Colored left border
    paddingBottom: 0, // No padding bottom if footer is there
    minHeight: 280, // Ensure minimum height for consistency
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
    marginTop: 'auto', // Pushes footer to bottom
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
});
