import React, { useState, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TextInput, FlatList, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { MapView } from '../../components/MapView';
import { EmployeesContext, EmployeesContextType } from '~/context/EmployeesContext';
import { Project, ProjectsContext, ProjectsContextType } from '~/context/ProjectsContext';
import { theme } from '../../theme'; // Corrected import path
import AnimatedScreen from '../../components/AnimatedScreen'; // Corrected import path
import { Ionicons } from '@expo/vector-icons'; 

import { Employee } from '../../types';


function hexToRgba(hex: string, alpha: number) {
  if (!/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) return `rgba(0,0,0,${alpha})`;
  let c = hex.substring(1).split('');
  if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  const num = parseInt(c.join(''), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function MapOverviewScreen() { 
  const { employees } = useContext(EmployeesContext) as EmployeesContextType;
  const { projects } = useContext(ProjectsContext) as ProjectsContextType; // Explicitly typed

  const [selectedWorkers, setSelectedWorkers] = useState<Employee[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermProject, setSearchTermProject] = useState(''); 

  const handleWorkerPress = (employee: Employee) => {
    setSelectedWorkers(prev =>
      prev.find(e => e.id === employee.id)
        ? prev.filter(e => e.id !== employee.id)
        : [...prev, employee]
    );
  };

  const handleProjectPress = (project: Project) => {
    setSelectedProjects(prev =>
      prev.find(p => p.id === project.id)
        ? prev.filter(p => p.id !== project.id) // Fixed logic here: filter by project.id, not p.id
        : [...prev, project]
    );
  };

  const filteredWorkers = employees.filter((employee: Employee) => // Explicitly typed
    employee.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProjects = useMemo(() =>
    projects.filter((project: Project) => // Explicitly typed
      project.name.toLowerCase().includes(searchTermProject.toLowerCase())
    ),
    [projects, searchTermProject]
  );

  const renderWorkerItem = ({ item }: { item: Employee }) => {
    const isSelected = selectedWorkers.some(e => e.id === item.id); 
    return (
      <TouchableOpacity onPress={() => handleWorkerPress(item)} style={styles.listItem}>
        <View style={[styles.itemContent, isSelected && styles.selectedItem]}>
          <Image source={{ uri: item.avatar_url || undefined }} style={styles.avatar} />
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.full_name}</Text>
            <Text style={styles.itemSubtitle}>{item.email}</Text>
          </View>
          {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderProjectItem = ({ item }: { item: Project }) => {
    const isSelected = selectedProjects.some(p => p.id === item.id);
    return (
      <TouchableOpacity onPress={() => handleProjectPress(item)} activeOpacity={0.7}>
        <View style={[styles.projectItemContainer, { backgroundColor: hexToRgba(item.color || theme.colors.secondary, 0.1) }, isSelected && styles.projectItemSelected]}>
          <View style={[styles.projectColorIndicator, { backgroundColor: item.color || theme.colors.secondary }]} />
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemSubtitle}>{item.address}</Text>
          </View>
          {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
        </View>
      </TouchableOpacity>
    );
  };

  const mapViewSelectedWorkers = useMemo(() => {
    return selectedWorkers.map((e: Employee) => ({
      id: e.id,
      name: e.full_name,
      avatar: e.avatar_url ?? undefined, // Convert null to undefined
    }));
  }, [selectedWorkers]);

  const mapViewSelectedProjects = useMemo(() => {
    return selectedProjects.map(p => ({
      id: p.id,
      name: p.name,
      location: p.location,
      color: p.color,
      lastModified: p.lastModified,
    }));
  }, [selectedProjects]);


  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <View style={styles.mainLayout}>
          <View style={styles.leftPanel}>
            <Text style={styles.panelTitle}>Workers</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search workers..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#999"
            />
            <FlatList
              data={filteredWorkers}
              renderItem={renderWorkerItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.workerListContent}
            />
          </View>

          <View style={styles.centerPanel}>
            <MapView
              initialRegion={{
                latitude: 52.5200,
                longitude: 13.4050,
                latitudeDelta: 0.2,
                longitudeDelta: 0.2,
              }}
              selectedWorkers={mapViewSelectedWorkers}
              selectedProjects={mapViewSelectedProjects}
            />
          </View>

          <View style={styles.rightPanel}>
            <Text style={styles.panelTitle}>Projects</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search projects..."
              value={searchTermProject}
              onChangeText={setSearchTermProject}
              placeholderTextColor="#999"
            />
            <FlatList
              data={filteredProjects} 
              renderItem={renderProjectItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.projectListContent}
            />
          </View>
        </View>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing(2), 
    backgroundColor: theme.colors.pageBackground,
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
  itemContent: { 
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    flex: 1, 
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
  projectColorIndicator: {
    width: 30, 
    height: 30, 
    borderRadius: theme.radius.sm, 
    marginRight: theme.spacing(1.5), 
  },
  projectItemContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.borderColor,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
  },
  projectItemSelected: {
    backgroundColor: theme.colors.primaryMuted,
  },
  itemInfo: { 
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
});