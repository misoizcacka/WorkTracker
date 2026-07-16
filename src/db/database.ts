import * as SQLite from 'expo-sqlite';
import { WorkSession } from '~/types';

const DB_NAME = 'workhourstracker.db';

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
    correction_minutes INTEGER DEFAULT 0 NOT NULL,
    assigned_date TEXT,
    sort_key TEXT,
    ref_id TEXT,
    ref_type TEXT,
    synced INTEGER DEFAULT 0 NOT NULL
);
`;

const CREATE_LOCAL_LOCATION_EVENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS local_location_events (
    id TEXT PRIMARY KEY NOT NULL,
    timestamp TEXT NOT NULL,
    company_id TEXT NOT NULL,
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
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync(
    CREATE_LOCAL_ASSIGNMENTS_TABLE_SQL + '\n' +
    CREATE_LOCAL_WORK_SESSIONS_TABLE_SQL + '\n' +
    CREATE_LOCAL_LOCATION_EVENTS_TABLE_SQL
  );

  // Migrate local_work_sessions — add new columns if missing (existing installs)
  const workSessionColumns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(local_work_sessions);`);
  const wsColNames = workSessionColumns.map(c => c.name);
  if (!wsColNames.includes('correction_minutes')) {
    await db.execAsync(`ALTER TABLE local_work_sessions ADD COLUMN correction_minutes INTEGER DEFAULT 0 NOT NULL;`);
  }
  if (!wsColNames.includes('assigned_date')) {
    await db.execAsync(`ALTER TABLE local_work_sessions ADD COLUMN assigned_date TEXT;`);
  }
  if (!wsColNames.includes('sort_key')) {
    await db.execAsync(`ALTER TABLE local_work_sessions ADD COLUMN sort_key TEXT;`);
  }
  if (!wsColNames.includes('ref_id')) {
    await db.execAsync(`ALTER TABLE local_work_sessions ADD COLUMN ref_id TEXT;`);
  }
  if (!wsColNames.includes('ref_type')) {
    await db.execAsync(`ALTER TABLE local_work_sessions ADD COLUMN ref_type TEXT;`);
  }
  const locationEventColumns = await db.getAllAsync<{ name: string; notnull: number }>(`PRAGMA table_info(local_location_events);`);
  const hasCompanyIdColumn = locationEventColumns.some(column => column.name === 'company_id');
  const companyIdIsRequired = locationEventColumns.some(column => column.name === 'company_id' && column.notnull === 1);
  if (!hasCompanyIdColumn) {
    await db.execAsync(`
      BEGIN TRANSACTION;
      ALTER TABLE local_location_events RENAME TO local_location_events_legacy;
      ${CREATE_LOCAL_LOCATION_EVENTS_TABLE_SQL}
      DROP TABLE local_location_events_legacy;
      COMMIT;
    `);
  } else if (!companyIdIsRequired) {
    await db.execAsync(`
      BEGIN TRANSACTION;
      ALTER TABLE local_location_events RENAME TO local_location_events_legacy;
      ${CREATE_LOCAL_LOCATION_EVENTS_TABLE_SQL}
      INSERT INTO local_location_events (id, timestamp, company_id, type, assignment_id, worker_id, latitude, longitude, notes, synced)
      SELECT id, timestamp, company_id, type, assignment_id, worker_id, latitude, longitude, notes, synced
      FROM local_location_events_legacy
      WHERE company_id IS NOT NULL;
      DROP TABLE local_location_events_legacy;
      COMMIT;
    `);
  }
  return db;
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return Promise.resolve(_db);
  if (!_dbPromise) {
    _dbPromise = initializeDb().then(db => {
      _db = db;
      return db;
    });
  }
  return _dbPromise;
}

/**
 * Reconstructs the nested worker_assignments object from the flat SQLite columns
 * so local sessions have the same shape as Supabase-fetched sessions.
 */
function hydrateWorkSession(row: any): any {
  const { assigned_date, sort_key, ref_id, ref_type, ...rest } = row;
  return {
    ...rest,
    worker_assignments: (assigned_date || sort_key || ref_id || ref_type)
      ? { assigned_date, sort_key, ref_id, ref_type }
      : undefined,
  };
}

export async function insertLocalAssignment(assignment: any) {
  const db = await getDb();
  return db.runAsync(
    `INSERT INTO local_assignments (id, company_id, worker_id, assigned_date, sort_key, ref_id, ref_type, start_time, created_at, created_by, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    assignment.id, assignment.company_id, assignment.worker_id, assignment.assigned_date, assignment.sort_key, assignment.ref_id, assignment.ref_type, assignment.start_time, assignment.created_at, assignment.created_by, assignment.synced ? 1 : 0
  );
}

export async function getLocalAssignments(workerId: string, assignedDate: string): Promise<any[]> {
  const db = await getDb();
  return await db.getAllAsync(
    `SELECT * FROM local_assignments WHERE worker_id = ? AND assigned_date = ? ORDER BY sort_key`,
    workerId, assignedDate
  );
}

export async function insertLocalWorkSession(session: any) {
  const db = await getDb();
  // Flatten worker_assignments join data into dedicated columns so it's
  // available offline without needing a separate join query.
  const assignedDate = session.worker_assignments?.assigned_date ?? session.assigned_date ?? null;
  const sortKey = session.worker_assignments?.sort_key ?? session.sort_key ?? null;
  const refId = session.worker_assignments?.ref_id ?? session.ref_id ?? null;
  const refType = session.worker_assignments?.ref_type ?? session.ref_type ?? null;

  // INSERT OR REPLACE so calling this with an already-synced session (e.g. mirroring
  // an online check-in) doesn't crash on the PRIMARY KEY constraint.
  return db.runAsync(
    `INSERT OR REPLACE INTO local_work_sessions
      (id, created_at, company_id, worker_id, assignment_id, start_time, end_time,
       total_break_minutes, correction_minutes, assigned_date, sort_key, ref_id, ref_type, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    session.id, session.created_at, session.company_id, session.worker_id,
    session.assignment_id, session.start_time, session.end_time ?? null,
    session.total_break_minutes ?? 0, session.correction_minutes ?? 0,
    assignedDate, sortKey, refId, refType,
    session.synced ? 1 : 0
  );
}

/** Returns any open (no end_time) work session for this worker, regardless of date. */
export async function getLocalActiveWorkSession(workerId: string): Promise<any | null> {
  const db = await getDb();
  const result = await db.getAllAsync(
    `SELECT * FROM local_work_sessions WHERE worker_id = ? AND (end_time IS NULL OR end_time = '') ORDER BY start_time DESC LIMIT 1`,
    workerId
  );
  const row = result[0] as any;
  if (!row) return null;
  return hydrateWorkSession(row);
}

export async function updateLocalWorkSession(session: any) {
  const db = await getDb();
  // Flatten worker_assignments if present so we don't lose the data on update
  const assignedDate = session.worker_assignments?.assigned_date ?? session.assigned_date ?? null;
  const sortKey = session.worker_assignments?.sort_key ?? session.sort_key ?? null;
  const refId = session.worker_assignments?.ref_id ?? session.ref_id ?? null;
  const refType = session.worker_assignments?.ref_type ?? session.ref_type ?? null;
  return db.runAsync(
    `UPDATE local_work_sessions
     SET end_time = ?, total_break_minutes = ?, correction_minutes = ?,
         assigned_date = COALESCE(?, assigned_date),
         sort_key = COALESCE(?, sort_key),
         ref_id = COALESCE(?, ref_id),
         ref_type = COALESCE(?, ref_type),
         synced = ?
     WHERE id = ?`,
    session.end_time ?? null,
    session.total_break_minutes ?? 0,
    session.correction_minutes ?? 0,
    assignedDate, sortKey, refId, refType,
    session.synced ? 1 : 0,
    session.id
  );
}

export async function getLocalWorkSessions(workerId: string, assignedDate: string): Promise<any[]> {
  const db = await getDb();
  // Match sessions whose start_time falls on the given date OR whose stored assigned_date matches.
  const result = await db.getAllAsync(
    `SELECT * FROM local_work_sessions
     WHERE worker_id = ?
       AND (SUBSTR(start_time, 1, 10) = ? OR assigned_date = ?)
     ORDER BY start_time ASC`,
    workerId, assignedDate, assignedDate
  ) as any[];

  return result.map(hydrateWorkSession);
}

export async function insertLocalLocationEvent(event: any) {
  const db = await getDb();
  if (!event.companyId) {
    throw new Error('insertLocalLocationEvent requires companyId');
  }
  return db.runAsync(
    `INSERT OR IGNORE INTO local_location_events (id, timestamp, company_id, type, assignment_id, worker_id, latitude, longitude, notes, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    event.id, event.timestamp, event.companyId, event.type, event.assignmentId, event.workerId, event.latitude, event.longitude, event.notes, event.synced ? 1 : 0
  );
}

export async function getUnsyncedLocationEvents(): Promise<any[]> {
  const db = await getDb();
  return await db.getAllAsync(`SELECT * FROM local_location_events WHERE synced = 0`);
}

export async function markLocationEventsAsSynced(eventIds: string[]) {
  if (eventIds.length === 0) return;
  const db = await getDb();
  const placeholders = eventIds.map(() => '?').join(',');
  return db.runAsync(`UPDATE local_location_events SET synced = 1 WHERE id IN (${placeholders})`, ...eventIds);
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
  return db.runAsync(`UPDATE local_work_sessions SET synced = 1 WHERE id IN (${placeholders})`, ...sessionIds);
}
