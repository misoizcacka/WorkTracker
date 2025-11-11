import React from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import AnimatedScreen from '../../../components/AnimatedScreen';

const mockProjects = [
  {
    id: '1',
    name: 'Modern Villa Construction',
    address: '123 Luxury Lane, Berlin',
    status: 'In Progress',
  },
  {
    id: '2',
    name: 'Downtown Office Renovation',
    address: '456 Business Blvd, Berlin',
    status: 'Completed',
  },
  {
    id: '3',
    name: 'Suburban Home Scaffolding',
    address: '789 Family Rd, Potsdam',
    status: 'Not Started',
  },
  {
    id: '4',
    name: 'Historic Building Restoration',
    address: '101 History Alley, Berlin',
    status: 'In Progress',
  },
];

export default function ProjectsScreen() {
  const router = useRouter();

  const handleProjectPress = (projectId: string) => {
    router.push(`/(worker)/${projectId}`);
  };

  const renderProject = ({ item }) => (
    <TouchableOpacity onPress={() => handleProjectPress(item.id)}>
      <Card style={styles.projectCard}>
        <Text style={styles.subtitle}>{item.name}</Text>
        <Text style={styles.addressText}>{item.address}</Text>
        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
          {item.status}
        </Text>
      </Card>
    </TouchableOpacity>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress':
        return theme.colors.warning;
      case 'Completed':
        return theme.colors.success;
      case 'Not Started':
        return theme.colors.textLight;
      default:
        return theme.colors.text;
    }
  };

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Today's Projects</Text>
        <FlatList
          data={mockProjects}
          renderItem={renderProject}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(1),
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  listContainer: {
    paddingHorizontal: theme.spacing(2),
    paddingBottom: theme.spacing(2),
  },
  projectCard: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
  },
  addressText: {
    color: theme.colors.textLight,
    marginTop: 4,
  },
  statusText: {
    marginTop: 8,
    fontWeight: 'bold',
  },
});
