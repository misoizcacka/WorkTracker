import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import { SearchableDropdown } from '../../../components/SearchableDropdown';
import { useProjects } from '../../../context/ProjectsContext';
import { supabase } from '../../../utils/supabase';
import { Project } from '~/types';

interface ReportRow {
  worker_id: string;
  worker_name: string;
  hours_on_project: number;
}

const JobCostingReport = () => {
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

  const totalProjectHours = reportData.reduce((sum, row) => sum + row.hours_on_project, 0);

  return (
    <AnimatedScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
        <Text style={styles.title}>Job Costing Report</Text>

        <Card style={styles.filterCard}>
          <Text style={styles.filterLabel}>Select a Project:</Text>
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
              <Text style={styles.cardTitle}>{selectedProject.name}</Text>
              <Text style={styles.projectAddress}>{selectedProject.address}</Text>
            </Card>

            <Card style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 3 }]}>Worker</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Hours on Project</Text>
              </View>
              {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: theme.spacing(4) }} />
              ) : reportData.length === 0 ? (
                <Text style={styles.noDataText}>No data available for this project.</Text>
              ) : (
                reportData.map((row) => (
                  <View key={row.worker_id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 3 }]}>{row.worker_name}</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{row.hours_on_project.toFixed(2)}</Text>
                  </View>
                ))
              )}
            </Card>

            <Card style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Project Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Project Hours</Text>
                <Text style={styles.summaryValue}>{totalProjectHours.toFixed(2)} hrs</Text>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.pageBackground },
    scrollContentContainer: { padding: theme.spacing(3) },
    title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.headingText, marginBottom: theme.spacing(3) },
    filterCard: { padding: theme.spacing(2), marginBottom: theme.spacing(3) },
    filterLabel: { fontSize: 16, fontWeight: '500', color: theme.colors.bodyText, marginBottom: theme.spacing(1) },
    projectInfoCard: { padding: theme.spacing(2), marginBottom: theme.spacing(3) },
    projectAddress: { fontSize: 14, color: theme.colors.bodyText },
    tableCard: { padding: theme.spacing(2), marginBottom: theme.spacing(3) },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: theme.colors.borderColor, paddingBottom: theme.spacing(1), marginBottom: theme.spacing(1) },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.borderColor, paddingVertical: theme.spacing(1.5), alignItems: 'center' },
    tableHeaderText: { fontWeight: '600', fontSize: 14, color: theme.colors.headingText },
    tableCell: { fontSize: 14, color: theme.colors.bodyText },
    noDataText: { textAlign: 'center', paddingVertical: theme.spacing(4), fontSize: 16, color: theme.colors.bodyText },
    summaryCard: { padding: theme.spacing(2), marginBottom: theme.spacing(3) },
    cardTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.headingText, marginBottom: theme.spacing(1) },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing(1) },
    summaryLabel: { fontSize: 16, color: theme.colors.bodyText },
    summaryValue: { fontSize: 18, fontWeight: 'bold', color: theme.colors.headingText },
});

export default JobCostingReport;