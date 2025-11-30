import React, { createContext, useState, useCallback } from 'react';

export interface Project {
  id: string;
  name: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  lastModified: string;
  photos: string[]; // Renamed from pictures
  explanation: string;
  // priority: 'High' | 'Medium' | 'Low'; // Removed
  // type: 'Construction' | 'Maintenance' | 'Inspection'; // Removed
  notes: string; // Added
  color: string; // Added for visual representation
}

export interface ProjectsContextType {
  projects: Project[];
  updateProject: (updatedProject: Project) => void;
  createProject: (projectData: Omit<Project, 'id' | 'lastModified' | 'priority' | 'type'>) => void;
}

export const ProjectsContext = createContext<ProjectsContextType | null>(null);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([
    { id: "1", name: "Office Renovation", address: "Some street 1, Berlin", location: { latitude: 52.5200, longitude: 13.4050 }, lastModified: new Date('2025-11-14T10:00:00Z').toISOString(), photos: [
      'https://loremflickr.com/640/480/office,renovation/all',
      'https://loremflickr.com/640/480/office,interior/all',
      'https://loremflickr.com/640/480/office,design/all',
      'https://loremflickr.com/640/480/office,modern/all',
      'https://loremflickr.com/640/480/office,furniture/all',
      'https://loremflickr.com/640/480/office,meeting/all',
      'https://loremflickr.com/640/480/office,workspace/all',
      'https://loremflickr.com/640/480/office,lighting/all',
      'https://loremflickr.com/640/480/office,exterior/all',
      'https://loremflickr.com/640/480/office,building/all',
    ], explanation: 'This project involves the renovation of a modern office space, focusing on open-plan design and energy efficiency upgrades.', notes: 'Phase 1: Demolition and structural work.', color: '#FF6347' },
    { id: "2", name: "Apartment Painting", address: "Another street 2, Berlin", location: { latitude: 52.5300, longitude: 13.4150 }, lastModified: new Date('2025-11-15T12:30:00Z').toISOString(), photos: ['https://loremflickr.com/640/480/apartment,painting/all'], explanation: 'A comprehensive painting project for a multi-unit apartment building, including interior and exterior surfaces.', notes: 'Weekly garden upkeep and fountain cleaning.', color: '#4682B4' },
    { id: "3", name: "Retail Construction", address: "Third street 3, Berlin", location: { latitude: 52.5100, longitude: 13.3850 }, lastModified: new Date('2025-11-13T15:00:00Z').toISOString(), photos: ['https://loremflickr.com/640/480/retail,construction/all'], explanation: 'Construction of a new retail outlet, featuring contemporary design and sustainable building materials.', notes: 'New retail space build-out.', color: '#32CD32' },
    { id: "4", name: "Bridge Construction", address: "Fourth street 4, Berlin", location: { latitude: 52.5150, longitude: 13.4250 }, lastModified: new Date('2025-11-15T09:00:00Z').toISOString(), photos: ['https://loremflickr.com/640/480/bridge,construction/all'], explanation: 'Major infrastructure project for a new bridge, designed to improve traffic flow and connect key urban areas.', notes: 'Bridge over river, phase 2.', color: '#DAA520' },
  ]);

  const updateProject = useCallback((updatedProject: Project) => {
    setProjects(prevProjects =>
      prevProjects.map((project: Project) =>
        project.id === updatedProject.id ? updatedProject : project
      )
    );
  }, []);

  const createProject = useCallback((projectData: Omit<Project, 'id' | 'lastModified' | 'priority' | 'type'>) => {
    const newProject: Project = {
      ...projectData,
      id: `proj-${Date.now()}`,
      lastModified: new Date().toISOString(),
      // photos and location will now come directly from projectData
    };
    setProjects(prevProjects => [newProject, ...prevProjects]);
  }, []);

  return (
    <ProjectsContext.Provider value={{ projects, updateProject, createProject }}>
      {children}
    </ProjectsContext.Provider>
  );
}