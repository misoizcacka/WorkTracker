import React, { useState, useContext } from "react";
import { View, Text, StyleSheet, FlatList, useWindowDimensions, TextInput, TouchableOpacity, Image } from "react-native";
import { Card } from "../../components/Card";
import AnimatedScreen from "../../components/AnimatedScreen";
import { theme } from "../../theme";
import { useRouter } from "expo-router";
import { ProjectsContext } from "./ProjectsContext";
import { WorkersContext } from "./WorkersContext";
import { Ionicons } from "@expo/vector-icons";

export default function ManagerProjects() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { projects } = useContext(ProjectsContext)!;
  const { workers } = useContext(WorkersContext)!;
  const [searchTerm, setSearchTerm] = useState('');

  const getNumColumns = () => {
    if (width < 640) return 1;
    if (width < 1024) return 2;
    return 3;
  };

  const numColumns = getNumColumns();

  const getWorkerCountForProject = (projectName: string) => {
    return workers.filter(worker => worker.project === projectName).length;
  };

  const sortedProjects = [...projects].sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

  const filteredProjects = sortedProjects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProjectPress = (projectId: string) => {
    router.push(`/(manager)/projects/${projectId}`);
  };

  const renderProjectCard = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => handleProjectPress(item.id)} style={{ width: `${100 / numColumns}%` }}>
      <Card style={styles.projectCard}>
        <Image source={{ uri: item.pictures[0] }} style={styles.projectImage} />
        <View style={styles.cardContent}>
          <Text style={styles.projectName}>{item.name}</Text>
          <Text style={styles.projectAddress}>{item.address}</Text>
          <View style={styles.cardFooter}>
            <View style={styles.footerStat}>
              <Ionicons name="people" size={16} color={theme.colors.textLight} />
              <Text style={styles.footerStatText}>{getWorkerCountForProject(item.name)}</Text>
            </View>
            <Text style={styles.lastModified}>Last updated: {new Date(item.lastModified).toLocaleDateString()}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.id as string}
          renderItem={renderProjectCard}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: theme.spacing(2),
  },
  header: {
    marginBottom: theme.spacing(2),
  },
  searchInput: {
    height: 40,
    borderColor: theme.colors.lightBorder,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
  },
  listContent: {
    paddingBottom: theme.spacing(10),
  },
  projectCard: {
    margin: theme.spacing(1),
    padding: 0,
    overflow: 'hidden',
  },
  projectImage: {
    width: '100%',
    height: 150,
  },
  cardContent: {
    padding: theme.spacing(2),
  },
  projectName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  projectAddress: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing(2),
  },
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerStatText: {
    marginLeft: theme.spacing(1),
    color: theme.colors.textLight,
  },
  lastModified: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
});
