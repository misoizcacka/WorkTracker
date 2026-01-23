export interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  role: 'worker' | 'manager' | 'owner';
  status: 'pending' | 'active' | 'disabled';
  avatar_url: string | null;
  reporting_to: string | null; // Changed to string | null
  created_at: string;
  company_id: string; // New: Add company_id
}

export interface Invite {
  id: string;
  full_name: string;
  email: string;
  role: 'worker' | 'manager';
  status: 'pending' | 'accepted' | 'expired';
  token: string; // Re-added token
  created_at: string;
  company_id: string; // New: Add company_id
  company_name: string; // NEW: Add company_name
}

export interface Project {
  id: string;
  name: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  lastModified: string;
  photos: string[]; // Supabase URLs
  explanation: string;
  notes: string;
  color: string;
}

export interface CommonLocation {
  id:string;
  name: string;
  company_id: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

// A single step in a worker's sequence for a day
export interface AssignmentStep {
  type: 'project' | 'common_location';
  ref_id: string; // The ID of the project or common_location
  id: string; // unique id for the step
  index: string; // Sparse index for ordering (e.g., "a0", "a1", "b0")
  start_time?: string | null;
}

// Represents a single row in the new normalized worker_assignments table
export interface AssignmentRecord {
  id: string; // UUID of this record (the assignment step itself)
  company_id: string;
  worker_id: string;
  assigned_date: string; // YYYY-MM-DD
  sort_key: string; // Fractional index for ordering
  ref_id: string; // The ID of the project or common_location
  ref_type: 'project' | 'common_location';
  start_time?: string | null;
  created_at: string;
  created_by: string;
  synced?: boolean; // New: 0 for false, 1 for true in SQLite
}

// A processed version of a step for the UI, with full data
export type ProcessedAssignmentStep = {
    id: string;
    sort_key: string; // Renamed from index
    ref_id: string; // Added from AssignmentRecord
    ref_type: 'project' | 'common_location'; // Added from AssignmentRecord
    start_time?: string | null;
} & (
    | {
        type: 'project';
        project?: Project;
      }
    | {
        type: 'common_location';
        location?: CommonLocation;
      }
);

export type AssignmentStatus = 'active' | 'completed' | 'next' | 'pending';

export type ProcessedAssignmentStepWithStatus = ProcessedAssignmentStep & {
  status: AssignmentStatus;
};

export interface WorkSession {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  company_id: string; // uuid
  worker_id: string; // uuid
  assignment_id: string; // uuid
  start_time: string; // timestamp with time zone
  end_time: string | null; // timestamp with time zone, nullable
  total_break_minutes?: number; // Added back from original DB schema
  synced?: boolean; // New: 0 for false, 1 for true in SQLite
  worker_assignments?: AssignmentRecord;
}
