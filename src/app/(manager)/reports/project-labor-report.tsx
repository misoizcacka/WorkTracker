import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from '../../../components/Themed';
import { SearchableDropdown } from '../../../components/SearchableDropdown';
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
      <ScrollView style={styles.containerNoPadding} contentContainerStyle={styles.scrollContentContainer}>
        <Card style={styles.filterCard}>
          <Text style={styles.filterLabel} fontType="medium">Select a Project:</Text>
          {projectsLoading ? (
            <ActivityIndicator />
          ) : (
            <SearchableDropdown
              data={projects}
              placeholder="Search for a project..."
              onSelect={(item) => setSelectedProject(item)}
              labelExtractor={(item) => item.name}
              keyExtractor={(item) => item.id}
              selectedValue={selectedProject}
            />
          )}
        </Card>

        {selectedProject && (
          <>
            <Card style={styles.projectInfoCard}>
              <Text style={styles.cardTitle} fontType="bold">{selectedProject.name}</Text>
              <Text style={styles.projectAddress} fontType="regular">{selectedProject.address}</Text>
            </Card>

            <Card style={styles.tableCard}>
              <View style={styles.tableHeader}>
                              <Text style={[styles.tableHeaderText, { flex: 3 }]} fontType="bold">Worker</Text>
                              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]} fontType="bold">Hours on Project</Text>              </View>
              {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: theme.spacing(4) }} />
              ) : reportData.length === 0 ? (
                <Text style={styles.noDataText} fontType="regular">No data available for this project.</Text>
              ) : (
                reportData.map((row) => (
                  <View key={row.worker_id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 3 }]} fontType="regular">{row.worker_name}</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]} fontType="regular">{row.hours_on_project.toFixed(2)}</Text>
                  </View>
                ))
              )}
            </Card>

            <Card style={styles.summaryCard}>
              <Text style={styles.cardTitle} fontType="bold">Project Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel} fontType="regular">Total Project Hours</Text>
                <Text style={styles.summaryValue} fontType="bold">{totalProjectHours.toFixed(2)} hrs</Text>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
    containerNoPadding: { flex: 1, backgroundColor: theme.colors.pageBackground },
    container: { flex: 1, backgroundColor: theme.colors.pageBackground },
    scrollContentContainer: { padding: theme.spacing(3) },
    pageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing(4),
      paddingHorizontal: theme.spacing(2),
      backgroundColor: theme.colors.background,
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
    title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.headingText, marginBottom: theme.spacing(3) },
    filterCard: { padding: theme.spacing(2), marginBottom: theme.spacing(3) },
    filterLabel: { fontSize: theme.fontSizes.md, color: theme.colors.bodyText, marginBottom: theme.spacing(1) },
    projectInfoCard: { padding: theme.spacing(2), marginBottom: theme.spacing(3) },
    projectAddress: { fontSize: theme.fontSizes.sm, color: theme.colors.bodyText },
    tableCard: { padding: theme.spacing(2), marginBottom: theme.spacing(3) },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: theme.colors.borderColor, paddingBottom: theme.spacing(1), marginBottom: theme.spacing(1) },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.borderColor, paddingVertical: theme.spacing(1.5), alignItems: 'center' },
    tableHeaderText: { fontSize: theme.fontSizes.sm, color: theme.colors.headingText },
    tableCell: { fontSize: theme.fontSizes.sm, color: theme.colors.bodyText },
    noDataText: { textAlign: 'center', paddingVertical: theme.spacing(4), fontSize: theme.fontSizes.md, color: theme.colors.bodyText },
    summaryCard: { padding: theme.spacing(2), marginBottom: theme.spacing(3) },
    cardTitle: { fontSize: theme.fontSizes.lg, color: theme.colors.headingText, marginBottom: theme.spacing(1) },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing(1) },
    summaryLabel: { fontSize: theme.fontSizes.md, color: theme.colors.bodyText },
    summaryValue: { fontSize: theme.fontSizes.lg, color: theme.colors.headingText },
});




export default ProjectLaborReport;