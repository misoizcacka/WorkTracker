import { Worker, Project, Assignment } from './types';

export const mockWorkers: Worker[] = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Charlie' },
  { id: '4', name: 'David' },
];

export const mockProjects: Project[] = [
  { id: 'p1', name: 'Website Redesign', color: '#FF6347' }, // Tomato
  { id: 'p2', name: 'Mobile App Development', color: '#4682B4' }, // SteelBlue
  { id: 'p3', name: 'Database Migration', color: '#3CB371' }, // MediumSeaGreen
  { id: 'p4', name: 'Cloud Infrastructure Setup', color: '#FFD700' }, // Gold
  { id: 'p5', name: 'Security Audit', color: '#8A2BE2' }, // BlueViolet
];

export const mockAssignments: Assignment[] = [
  {
    id: 'a1',
    workerId: '1',
    projectId: 'p1',
    startDate: new Date(new Date().setHours(9, 0, 0, 0)),
    endDate: new Date(new Date().setHours(11, 0, 0, 0)),
    notes: 'Initial design phase',
  },
  {
    id: 'a2',
    workerId: '2',
    projectId: 'p2',
    startDate: new Date(new Date().setHours(10, 0, 0, 0)),
    endDate: new Date(new Date().setHours(12, 0, 0, 0)),
    notes: 'Frontend development',
  },
  {
    id: 'a3',
    workerId: '1',
    projectId: 'p3',
    startDate: new Date(new Date().setHours(14, 0, 0, 0)),
    endDate: new Date(new Date().setHours(16, 0, 0, 0)),
    notes: 'Data cleaning and migration scripts',
  },
];
