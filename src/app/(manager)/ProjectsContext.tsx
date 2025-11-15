import React, { useState } from 'react';

export interface Project {
  id: string;
  name: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  lastModified: string;
  pictures: string[];
}

export const ProjectsContext = React.createContext<{
  projects: Project[];
} | null>(null);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([
    { id: "1", name: "Office Renovation", address: "Some street 1, Berlin", location: { latitude: 52.5200, longitude: 13.4050 }, lastModified: new Date('2025-11-14T10:00:00Z').toISOString(), pictures: ['https://loremflickr.com/640/480/office,renovation/all'] },
    { id: "2", name: "Apartment Painting", address: "Another street 2, Berlin", location: { latitude: 52.5300, longitude: 13.4150 }, lastModified: new Date('2025-11-15T12:30:00Z').toISOString(), pictures: ['https://loremflickr.com/640/480/apartment,painting/all'] },
    { id: "3", name: "Retail Construction", address: "Third street 3, Berlin", location: { latitude: 52.5100, longitude: 13.3850 }, lastModified: new Date('2025-11-13T15:00:00Z').toISOString(), pictures: ['https://loremflickr.com/640/480/retail,construction/all'] },
    { id: "4", name: "Bridge Construction", address: "Fourth street 4, Berlin", location: { latitude: 52.5150, longitude: 13.4250 }, lastModified: new Date('2025-11-15T09:00:00Z').toISOString(), pictures: ['https://loremflickr.com/640/480/bridge,construction/all'] },
  ]);

  return (
    <ProjectsContext.Provider value={{ projects }}>
      {children}
    </ProjectsContext.Provider>
  );
}
