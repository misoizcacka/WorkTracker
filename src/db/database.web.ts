import { WorkSession } from '~/types';

// Mock DB implementation for web - we don't need a local SQLite DB here.
export async function getDb(): Promise<any> {
  return null;
}

export async function insertLocalAssignment(assignment: any) {
  return null;
}

export async function getLocalAssignments(workerId: string, assignedDate: string): Promise<any[]> {
  return [];
}

export async function insertLocalWorkSession(session: any) {
  return null;
}

export async function updateLocalWorkSession(session: any) {
  return null;
}

export async function getLocalWorkSessions(workerId: string, assignedDate: string): Promise<any[]> {
  return [];
}

export async function insertLocalLocationEvent(event: any) {
  return null;
}

export async function getUnsyncedLocationEvents(): Promise<any[]> {
  return [];
}

export async function markLocationEventsAsSynced(eventIds: string[]) {
  return null;
}

export async function getUnsyncedWorkSessions(): Promise<WorkSession[]> {
  return [];
}

export async function markWorkSessionsAsSynced(sessionIds: string[]) {
  return null;
}
