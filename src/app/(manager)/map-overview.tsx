import React, { useState, useContext, useMemo, useEffect } from 'react';
import { View, StyleSheet, Image, TextInput, FlatList, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Text } from '../../components/Themed';
import { MapView } from '../../components/MapView';
import { useSession } from '~/context/AuthContext';
import { EmployeesContext, EmployeesContextType } from '~/context/EmployeesContext';
import { Project, ProjectsContext, ProjectsContextType } from '~/context/ProjectsContext';
import { theme } from '../../theme'; // Corrected import path
import AnimatedScreen from '../../components/AnimatedScreen'; // Corrected import path
import { Ionicons } from '@expo/vector-icons'; 

import { Employee } from '../../types';
import { fetchLatestLocationForWorkers, LatestLocation } from '~/services/locationEvents';


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
  const { user } = useSession();
  const { employees } = useContext(EmployeesContext) as EmployeesContextType;
  const { projects } = useContext(ProjectsContext) as ProjectsContextType; // Explicitly typed

  const [selectedWorkers, setSelectedWorkers] = useState<Employee[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermProject, setSearchTermProject] = useState('');
  const [workerLocations, setWorkerLocations] = useState<LatestLocation[]>([]);

  useEffect(() => {
    if (selectedWorkers.length > 0) {
      const workerIds = selectedWorkers.map(w => w.id);
      fetchLatestLocationForWorkers(workerIds).then(locations => {
        setWorkerLocations(locations);
      });
    } else {
      setWorkerLocations([]);
    }
  }, [selectedWorkers]);

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
    employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    employee.role === 'worker' &&
    employee.id !== user?.id
  );

  const filteredProjects = useMemo(() =>
    projects.filter((project: Project) => // Explicitly typed
      project.name.toLowerCase().includes(searchTermProject.toLowerCase())
    ),
    [projects, searchTermProject]
  );

  const renderWorkerItem = ({ item }: { item: Employee }) => {
    const isSelected = selectedWorkers.some(e => e.id === item.id);
    const itemNameColor = isSelected ? theme.colors.primary : styles.itemName.color;
    const itemSubtitleColor = isSelected ? theme.colors.bodyText : styles.itemSubtitle.color; // Keep bodyText or adjust if needed
    const iconColor = isSelected ? theme.colors.primary : theme.colors.bodyText; // For person placeholder
    const checkmarkColor = isSelected ? theme.colors.primary : theme.colors.primary; // For checkmark icon

    return (
      <TouchableOpacity onPress={() => handleWorkerPress(item)} style={styles.listItem}>
        <View style={[styles.itemContent, isSelected && styles.selectedItem]}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <Ionicons name="person" size={40} color={iconColor} style={styles.avatarPlaceholder} />
          )}
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, { color: itemNameColor }]} fontType="medium">{item.full_name}</Text>
            <Text style={[styles.itemSubtitle, { color: itemSubtitleColor }]} fontType="regular">{item.email}</Text>
          </View>
          {isSelected && <Ionicons name="checkmark-circle" size={20} color={checkmarkColor} />}
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
            <Text style={styles.itemName} fontType="medium">{item.name}</Text>
            <Text style={styles.itemSubtitle} fontType="regular">{item.address}</Text>
          </View>
          {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
        </View>
      </TouchableOpacity>
    );
  };

  const mapViewSelectedWorkers = useMemo(() => {
    return selectedWorkers.map((e: Employee) => {
      const locationData = workerLocations.find(l => l.worker_id === e.id);
      return {
        id: e.id,
        name: e.full_name,
        avatar: e.avatar_url ?? undefined,
        location: locationData ? {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        } : undefined,
        lastSeen: locationData?.timestamp,
      };
    });
  }, [selectedWorkers, workerLocations]);

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
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle} fontType="bold">Map Overview</Text>
        <Text style={styles.pageSubtitle}>Visualize worker and project locations.</Text>
      </View>
      <View style={styles.mainContentCard}>
        <View style={styles.mainLayout}>
          <View style={styles.leftPanel}>
            <Text style={styles.panelTitle} fontType="medium">Workers</Text>
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
            <Text style={styles.panelTitle} fontType="medium">Projects</Text>
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
  mainContentCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(2),
    marginHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(2),
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
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
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
    backgroundColor: theme.colors.cardBackground, 
  },
  rightPanel: {
    width: 280,
    backgroundColor: theme.colors.cardBackground,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(2),
  },
  panelTitle: {
    fontSize: theme.fontSizes.lg,
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
    color: theme.colors.headingText,
  },
  itemSubtitle: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    marginRight: theme.spacing(2),
    textAlign: 'center',
    lineHeight: 40,
  },
});
