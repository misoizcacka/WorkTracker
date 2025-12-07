export interface Worker {
  id: string;
  name: string;
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
}

export interface Assignment {
  id: string;
  workerId: string;
  projectId: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
  assignedTime?: string | null; // New optional field for specific assignment time (HH:mm)
}