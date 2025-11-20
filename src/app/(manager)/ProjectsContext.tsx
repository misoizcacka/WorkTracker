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
  photos: string[]; // Renamed from pictures
  explanation: string;
  priority: 'High' | 'Medium' | 'Low'; // Added
  type: 'Construction' | 'Maintenance' | 'Inspection'; // Added
  notes: string; // Added
  color: string; // Added for visual representation
}

export const ProjectsContext = React.createContext<{
  projects: Project[];
} | null>(null);

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
    ], explanation: 'This project involves the renovation of a modern office space, focusing on open-plan design and energy efficiency upgrades.', priority: 'High', type: 'Construction', notes: 'Phase 1: Demolition and structural work.', color: '#FF6347' },
    { id: "2", name: "Apartment Painting", address: "Another street 2, Berlin", location: { latitude: 52.5300, longitude: 13.4150 }, lastModified: new Date('2025-11-15T12:30:00Z').toISOString(), photos: ['https://loremflickr.com/640/480/apartment,painting/all'], explanation: 'A comprehensive painting project for a multi-unit apartment building, including interior and exterior surfaces.', priority: 'Medium', type: 'Maintenance', notes: 'Weekly garden upkeep and fountain cleaning.', color: '#4682B4' },
    { id: "3", name: "Retail Construction", address: "Third street 3, Berlin", location: { latitude: 52.5100, longitude: 13.3850 }, lastModified: new Date('2025-11-13T15:00:00Z').toISOString(), photos: ['https://loremflickr.com/640/480/retail,construction/all'], explanation: 'Construction of a new retail outlet, featuring contemporary design and sustainable building materials.', priority: 'Low', type: 'Construction', notes: 'New retail space build-out.', color: '#32CD32' },
    { id: "4", name: "Bridge Construction", address: "Fourth street 4, Berlin", location: { latitude: 52.5150, longitude: 13.4250 }, lastModified: new Date('2025-11-15T09:00:00Z').toISOString(), photos: ['https://loremflickr.com/640/480/bridge,construction/all'], explanation: 'Major infrastructure project for a new bridge, designed to improve traffic flow and connect key urban areas.', priority: 'High', type: 'Construction', notes: 'Bridge over river, phase 2.', color: '#DAA520' },
  ]);

  return (
    <ProjectsContext.Provider value={{ projects }}>
      {children}
    </ProjectsContext.Provider>
  );
}
