import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, Image, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { MapView } from '../../components/MapView';
import { WorkersContext, Worker } from './WorkersContext';
import { ProjectsContext, Project } from './ProjectsContext';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import { Card } from '../../components/Card';

export default function ManagerDashboard() {
  const { workers } = useContext(WorkersContext)!;
  const { projects } = useContext(ProjectsContext)!;

  const [selectedWorkers, setSelectedWorkers] = useState<Worker[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const activeWorkers = workers.filter(w => w.status === 'onSite').length;
  const workersOffSite = workers.filter(w => w.status === 'offSite').length;
  const totalHoursToday = workers.reduce((acc, worker) => acc + worker.hours, 0);
  const overtimeHours = workers.reduce((acc, worker) => worker.hours > 8 ? acc + (worker.hours - 8) : acc, 0);

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
    worker.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderWorkerItem = ({ item }: { item: Worker }) => {
    const isSelected = selectedWorkers.find(w => w.id === item.id);
    return (
      <TouchableOpacity onPress={() => handleWorkerPress(item)}>
        <View style={[styles.listItem, isSelected && styles.selectedItem]}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          <View>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemSubtitle}>{item.project}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderProjectItem = ({ item }: { item: Project }) => {
    const isSelected = selectedProjects.find(p => p.id === item.id);
    return (
      <TouchableOpacity onPress={() => handleProjectPress(item)}>
        <View style={[styles.listItem, isSelected && styles.selectedItem]}>
          <View>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemSubtitle}>{item.address}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <AnimatedScreen>
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{activeWorkers}/{workers.length}</Text>
          <Text style={styles.statLabel}>Workers Active</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{workersOffSite}</Text>
          <Text style={styles.statLabel}>Workers Off-Site</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{projects.length}</Text>
          <Text style={styles.statLabel}>Projects Today</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{totalHoursToday.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Hours Today</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{overtimeHours.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Overtime Hours</Text>
        </Card>
      </View>
      <View style={styles.container}>
        <View style={styles.sidebar}>
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
          />
        </View>
        <View style={styles.mapContainer}>
          <MapView
            initialRegion={{
              latitude: 52.5200,
              longitude: 13.4050,
              latitudeDelta: 0.2,
              longitudeDelta: 0.2,
            }}
            selectedWorkers={selectedWorkers}
            selectedProjects={selectedProjects}
          />
        </View>
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Today's Projects</Text>
          <FlatList
            data={projects}
            renderItem={renderProjectItem}
            keyExtractor={item => item.id}
          />
        </View>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing(2),
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    paddingVertical: theme.spacing(2),
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  sidebar: {
    width: 300,
    backgroundColor: theme.colors.background,
    padding: theme.spacing(2),
    borderRightWidth: 1,
    borderColor: theme.colors.lightBorder,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: theme.spacing(2),
  },
  searchInput: {
    height: 40,
    borderColor: theme.colors.lightBorder,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(2),
    borderBottomWidth: 1,
    borderColor: theme.colors.lightBorder,
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
  itemName: {
    fontWeight: 'bold',
  },
  itemSubtitle: {
    color: theme.colors.textSecondary,
  },
  mapContainer: {
    flex: 1,
  },
});
