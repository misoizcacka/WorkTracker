import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, TextInput, FlatList } from 'react-native';
import { Text } from '../../../components/Themed';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { useProjects } from '../../../context/ProjectsContext';
import { supabase } from '../../../utils/supabase';
import { Project } from '~/types';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface ReportRow {
  worker_id: string;
  worker_name: string;
  hours_on_project: number;
}

const ProjectLaborReport = () => {
  const router = useRouter();
  const { projects, isLoading: projectsLoading } = useProjects();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProjects = useMemo(() => {
    return projects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  useEffect(() => {
    if (!selectedProject) {
      setReportData([]);
      return;
    }

    const fetchReportData = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_project_costing_report', {
        project_id_param: selectedProject.id,
      });

      if (error) {
        console.error('Error fetching job costing report:', error);
        setReportData([]);
      } else {
        setReportData(data || []);
      }
      setLoading(false);
    };

    fetchReportData();
  }, [selectedProject]);

  const totalProjectHours = reportData.reduce((sum: number, row: ReportRow) => sum + row.hours_on_project, 0);

  const renderProjectItem = ({ item }: { item: Project }) => {
    const isSelected = selectedProject?.id === item.id;
    return (
      <TouchableOpacity 
        onPress={() => setSelectedProject(item)} 
        style={[styles.projectItem, isSelected && styles.selectedProjectItem]}
      >
        <Ionicons 
          name="briefcase-outline" 
          size={20} 
          color={isSelected ? theme.colors.primary : theme.colors.bodyText} 
          style={styles.projectIcon}
        />
        <View style={styles.projectInfo}>
          <Text style={[styles.projectName, isSelected && styles.selectedProjectText]} fontType="medium" numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.projectSubtext} fontType="regular" numberOfLines={1}>
            {item.address || 'No address'}
          </Text>
        </View>
        {isSelected && <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />}
      </TouchableOpacity>
    );
  };

  return (
    <AnimatedScreen>
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.headingText} />
        </TouchableOpacity>
        <View>
          <Text style={styles.pageTitle} fontType="bold">Project Labor Report</Text>
          <Text style={styles.pageSubtitle}>Analyze labor hours spent on specific projects.</Text>
        </View>
      </View>

      <View style={styles.mainContentCard}>
        <View style={styles.mainLayout}>
          {/* --- Left Panel: Project List --- */}
          <View style={styles.leftPanel}>
            <Text style={styles.panelTitle} fontType="bold">Projects</Text>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={18} color={theme.colors.bodyText} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search projects..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholderTextColor={theme.colors.bodyText}
              />
            </View>
            
            {projectsLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
            ) : (
              <FlatList
                data={filteredProjects}
                renderItem={renderProjectItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.projectListContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

          {/* --- Right Panel: Report Details --- */}
          <View style={styles.rightPanel}>
            {selectedProject ? (
              <ScrollView contentContainerStyle={styles.detailsContent} showsVerticalScrollIndicator={false}>
                {/* --- Project Header Stats --- */}
                <View style={styles.statsRow}>
                  <View style={styles.projectHeaderInfo}>
                    <Text style={styles.projectTitle} fontType="bold">{selectedProject.name}</Text>
                    <Text style={styles.projectAddress} fontType="regular">{selectedProject.address}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel} fontType="bold">Total Hours</Text>
                    <Text style={styles.statValue} fontType="bold">{totalProjectHours.toFixed(2)}h</Text>
                  </View>
                </View>

                {/* --- Labor Table --- */}
                <View style={styles.tableContainer}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.colWorker]} fontType="bold">Worker Name</Text>
                    <Text style={[styles.tableHeaderText, styles.colHours]} fontType="bold">Hours Logged</Text>
                  </View>

                  {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: theme.spacing(4) }} />
                  ) : reportData.length === 0 ? (
                    <Text style={styles.noDataText} fontType="regular">No labor data found for this project.</Text>
                  ) : (
                    reportData.map((row) => (
                      <View key={row.worker_id} style={styles.tableRow}>
                        <Text style={[styles.tableCell, styles.colWorker]} fontType="medium">{row.worker_name}</Text>
                        <View style={[styles.tableCell, styles.colHours]}>
                          <View style={styles.hoursBadge}>
                            <Text style={styles.hoursBadgeText} fontType="bold">{row.hours_on_project.toFixed(2)}</Text>
                          </View>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="briefcase-outline" size={64} color={theme.colors.borderColor} />
                <Text style={styles.emptyStateText} fontType="regular">Select a project from the list to view labor details.</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  pageHeader: {
    paddingVertical: theme.spacing(4),
    paddingHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.background,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: theme.spacing(2),
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
    marginHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(2),
    overflow: 'hidden',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      native: {
        elevation: 6,
      },
    }),
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    width: 300,
    borderRightWidth: 1,
    borderColor: theme.colors.borderColor,
    backgroundColor: theme.colors.background,
    padding: theme.spacing(2),
  },
  panelTitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    paddingHorizontal: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  searchIcon: {
    marginRight: theme.spacing(0.5),
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: theme.colors.headingText,
    fontSize: theme.fontSizes.sm,
  },
  projectListContent: {
    paddingBottom: theme.spacing(2),
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(1),
    backgroundColor: theme.colors.pageBackground,
  },
  selectedProjectItem: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
  projectIcon: {
    marginRight: theme.spacing(1.5),
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  selectedProjectText: {
    color: theme.colors.primary,
  },
  projectSubtext: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
  },
  rightPanel: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
  },
  detailsContent: {
    padding: theme.spacing(3),
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.pageBackground,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2.5),
    marginBottom: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    alignItems: 'center',
  },
  projectHeaderInfo: {
    flex: 2,
  },
  projectTitle: {
    fontSize: 22,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  projectAddress: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: theme.colors.borderColor,
    marginHorizontal: theme.spacing(3),
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing(0.5),
  },
  statValue: {
    fontSize: 24,
    color: theme.colors.primary,
  },
  tableContainer: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.pageBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    paddingVertical: theme.spacing(2),
    borderTopLeftRadius: theme.radius.md,
    borderTopRightRadius: theme.radius.md,
  },
  tableHeaderText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.headingText,
    paddingHorizontal: theme.spacing(2),
  },
  tableBodyScroll: {
    paddingBottom: theme.spacing(2),
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    paddingVertical: theme.spacing(2),
  },
  tableCell: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
    paddingHorizontal: theme.spacing(2),
  },
  colWorker: {
    flex: 3,
  },
  colHours: {
    flex: 1,
    alignItems: 'flex-end',
    textAlign: 'right',
  },
  hoursBadge: {
    backgroundColor: theme.colors.primaryMuted,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
  },
  hoursBadgeText: {
    color: theme.colors.primary,
    fontSize: theme.fontSizes.md,
  },
  noDataText: {
    textAlign: 'center',
    paddingVertical: theme.spacing(6),
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing(10),
  },
  emptyStateText: {
    marginTop: theme.spacing(2),
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
    textAlign: 'center',
    maxWidth: 300,
  },
  loader: {
    marginTop: theme.spacing(4),
  }
});

export default ProjectLaborReport;