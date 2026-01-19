import * as SQLite from 'expo-sqlite';
import { WorkSession } from '~/types';

// Define the database name
const DB_NAME = 'workhourstracker.db';

// Define table creation SQL statements
const CREATE_LOCAL_ASSIGNMENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS local_assignments (
    id TEXT PRIMARY KEY NOT NULL,
    company_id TEXT NOT NULL,
    worker_id TEXT NOT NULL,
    assigned_date TEXT NOT NULL,
    sort_key TEXT NOT NULL,
    ref_id TEXT NOT NULL,
    ref_type TEXT NOT NULL,
    start_time TEXT,
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    synced INTEGER DEFAULT 0 NOT NULL
);
`;

const CREATE_LOCAL_WORK_SESSIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS local_work_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    created_at TEXT NOT NULL,
    company_id TEXT NOT NULL,
    worker_id TEXT NOT NULL,
    assignment_id TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    total_break_minutes INTEGER DEFAULT 0 NOT NULL,
    synced INTEGER DEFAULT 0 NOT NULL
);
`;

const CREATE_LOCAL_LOCATION_EVENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS local_location_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    assignment_id TEXT NOT NULL,
    worker_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    notes TEXT,
    synced INTEGER DEFAULT 0 NOT NULL
);
`;

let _db: SQLite.SQLiteDatabase | null = null;
let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function initializeDb(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.execAsync(
    CREATE_LOCAL_ASSIGNMENTS_TABLE_SQL + '\n' +
    CREATE_LOCAL_WORK_SESSIONS_TABLE_SQL + '\n' +
    CREATE_LOCAL_LOCATION_EVENTS_TABLE_SQL
  );

  console.log('SQLite database initialized and tables created.');
  return db;
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) {
    return Promise.resolve(_db);
  }
  if (!_dbPromise) {
    _dbPromise = initializeDb().then(db => {
      _db = db;
      return db;
    }).catch(error => {
      console.error("Failed to initialize database:", error);
      _dbPromise = null; // Reset promise on failure
      throw error;
    });
  }
  return _dbPromise;
}

// Export some basic CRUD for debugging/testing (can be expanded later)
export async function insertLocalAssignment(assignment: any) {
  const db = await getDb();
  return db.runAsync(
    `INSERT INTO local_assignments (id, company_id, worker_id, assigned_date, sort_key, ref_id, ref_type, start_time, created_at, created_by, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    assignment.id, assignment.company_id, assignment.worker_id, assignment.assigned_date, assignment.sort_key, assignment.ref_id, assignment.ref_type, assignment.start_time, assignment.created_at, assignment.created_by, assignment.synced ? 1 : 0
  );
}

export async function getLocalAssignments(workerId: string, assignedDate: string): Promise<any[]> {
  const db = await getDb();
  const result = await db.getAllAsync(
    `SELECT * FROM local_assignments WHERE worker_id = ? AND assigned_date = ? ORDER BY sort_key`,
    workerId, assignedDate
  );
  return result;
}

export async function insertLocalWorkSession(session: any) {
  const db = await getDb();
  return db.runAsync(
    `INSERT INTO local_work_sessions (id, created_at, company_id, worker_id, assignment_id, start_time, end_time, total_break_minutes, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    session.id, session.created_at, session.company_id, session.worker_id, session.assignment_id, session.start_time, session.end_time, session.total_break_minutes, session.synced ? 1 : 0
  );
}

export async function updateLocalWorkSession(session: any) {
  const db = await getDb();
  return db.runAsync(
    `UPDATE local_work_sessions SET end_time = ?, total_break_minutes = ?, synced = ? WHERE id = ?`,
    session.end_time, session.total_break_minutes, session.synced ? 1 : 0, session.id
  );
}

export async function getLocalWorkSessions(workerId: string, assignedDate: string): Promise<any[]> {
  const db = await getDb();
  type WorkSessionRow = {
    id: string;
    created_at: string;
    company_id: string;
    worker_id: string;
    assignment_id: string;
    start_time: string;
    end_time: string | null;
    total_break_minutes: number;
    synced: number;
    "assignment.sort_key": string;
  };

  const result = await db.getAllAsync(
    `SELECT
        lws.id,
        lws.created_at,
        lws.company_id,
        lws.worker_id,
        lws.assignment_id,
        lws.start_time,
        lws.end_time,
        lws.total_break_minutes,
        lws.synced,
        la.sort_key AS "assignment.sort_key" -- Alias for nested property
     FROM local_work_sessions lws
     JOIN local_assignments la ON lws.assignment_id = la.id
     WHERE lws.worker_id = ?
       AND SUBSTR(lws.start_time, 1, 10) = ? -- Compare YYYY-MM-DD part of start_time
     ORDER BY lws.start_time ASC`,
    workerId, assignedDate
  ) as WorkSessionRow[];

  // Manually construct the nested assignment object
  return result.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    company_id: row.company_id,
    worker_id: row.worker_id,
    assignment_id: row.assignment_id,
    start_time: row.start_time,
    end_time: row.end_time,
    total_break_minutes: row.total_break_minutes,
    synced: row.synced,
    assignment: {
      sort_key: row["assignment.sort_key"]
    }
  }));
}

export async function insertLocalLocationEvent(event: any) {
  const db = await getDb();
  return db.runAsync(
    `INSERT INTO local_location_events (timestamp, type, assignment_id, worker_id, latitude, longitude, notes, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    event.timestamp, event.type, event.assignmentId, event.workerId, event.latitude, event.longitude, event.notes, event.synced ? 1 : 0
  );
}

export async function getUnsyncedLocationEvents(): Promise<any[]> {
    const db = await getDb();
    const result = await db.getAllAsync(`SELECT * FROM local_location_events WHERE synced = 0`);
    return result;
}

export async function markLocationEventsAsSynced(eventIds: number[]) {
    if (eventIds.length === 0) return;
    const db = await getDb();
    const placeholders = eventIds.map(() => '?').join(',');
    return db.runAsync(
        `UPDATE local_location_events SET synced = 1 WHERE id IN (${placeholders})`,
        ...eventIds
    );
}

export async function getUnsyncedWorkSessions(): Promise<WorkSession[]> {
  const db = await getDb();
  const result = await db.getAllAsync(`SELECT * FROM local_work_sessions WHERE synced = 0`);
  return result as WorkSession[];
}

export async function markWorkSessionsAsSynced(sessionIds: string[]) {
  if (sessionIds.length === 0) return;
  const db = await getDb();
  const placeholders = sessionIds.map(() => '?').join(',');
  return db.runAsync(
      `UPDATE local_work_sessions SET synced = 1 WHERE id IN (${placeholders})`,
      ...sessionIds
  );
}