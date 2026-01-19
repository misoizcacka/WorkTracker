import React, { useState, useContext, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import {
  Project,
  ProcessedAssignmentStep,
  CommonLocation,
  AssignmentRecord,
  WorkSession,
} from '../types';
import {
  fetchAssignmentsForWorkers,
  insertAssignment,
  updateAssignment,
  deleteAssignment,
} from '../services/workerAssignments';
import { fetchCommonLocations } from '../services/commonLocations';
import {
  fetchActiveWorkSession,
  insertWorkSession,
  endWorkSession as endWorkSessionService,
  updateWorkSessionAssignment as updateWorkSessionAssignmentService,
  fetchWorkSessionsByDate,
  upsertWorkSessions,
} from '../services/workSessions';
import { insertLocationEvent } from '../services/locationEvents';
import { useSession } from '~/context/AuthContext';
import { useProjects } from '~/context/ProjectsContext';
import {
  startHeartbeatTracking,
  stopHeartbeatTracking,
} from '../services/heartbeatTracking';
import {
  getDb,
  insertLocalAssignment, getLocalAssignments,
  insertLocalWorkSession, updateLocalWorkSession,
  insertLocalLocationEvent, getUnsyncedLocationEvents, markLocationEventsAsSynced,
  getLocalWorkSessions,
  getUnsyncedWorkSessions,
  markWorkSessionsAsSynced,
} from '~/db/database';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import * as SQLite from 'expo-sqlite'; // Import SQLite for typing (though no longer SQLiteTransaction)
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import moment from 'moment';
import { generateId } from '~/utils/generateId';

export type AssignmentStatus = 'active' | 'completed' | 'next' | 'pending';

export type ProcessedAssignmentStepWithStatus = ProcessedAssignmentStep & {
  status: AssignmentStatus;
};

interface AssignmentsContextType {
  processedAssignments: Record<string, ProcessedAssignmentStepWithStatus[]>;
  assignments: AssignmentRecord[];
  commonLocations: CommonLocation[];
  isLoading: boolean;
  error: string | null;
  loadAssignmentsForDate: (date: string, workerIds: string[], forceFetchFromSupabase?: boolean) => Promise<void>;
  loadWorkSessionsForDate: (date: string, workerId: string) => Promise<void>;
  clearAssignments: () => void;
  insertAssignmentStep: (
    record: Omit<AssignmentRecord, 'id' | 'created_at' | 'created_by' | 'company_id'>
  ) => Promise<void>;
  updateAssignmentSortKey: (id: string, newSortKey: string) => Promise<void>;
  deleteAssignmentStep: (id: string) => Promise<void>;
  moveAssignmentBetweenWorkers: (
    id: string,
    newWorkerId: string,
    newSortKey: string
  ) => Promise<void>;
  updateAssignmentStartTime: (id: string, startTime: string | null) => Promise<void>;
  
  // Work Session Management
  activeWorkSession: WorkSession | null;
  workSessionsToday: WorkSession[];
  startWorkSession: (assignmentId: string, location: { latitude: number; longitude: number }) => Promise<void>;
  endWorkSession: (sessionId: string, location: { latitude: number; longitude: number }) => Promise<void>;
  updateWorkSessionAssignment: (sessionId: string, newAssignmentId: string) => Promise<void>;

  // Offline-First
  syncLocalChanges: () => Promise<void>;
  isOffline: boolean;
  lastCheckoutAssignmentId: string | null; // New prop
}

export const AssignmentsContext = React.createContext<AssignmentsContextType | null>(null);

export function useAssignments() {
  const context = useContext(AssignmentsContext);
  if (!context) {
    throw new Error('useAssignments must be used within an AssignmentsProvider');
  }
  return context;
}

const PAGE_SIZE = 50;

export function AssignmentsProvider({ children }: { children: React.ReactNode }) {
  const { user, userCompanyId, userRole } = useSession()!;
  const { projects: allProjects } = useProjects()!;

  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [commonLocations, setCommonLocations] = useState<CommonLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isOffline, setIsOffline] = useState(false);

  const [activeWorkSession, setActiveWorkSession] = useState<WorkSession | null>(null);
  const [workSessionsToday, setWorkSessionsToday] = useState<WorkSession[]>([]);
  const [lastCompletedSortKey, setLastCompletedSortKey] = useState<string | null>(null);
  const [lastCheckoutAssignmentId, setLastCheckoutAssignmentId] = useState<string | null>(null);
  const [lastCheckoutDate, setLastCheckoutDate] = useState<string | null>(null); // YYYY-MM-DD

  // Initialize SQLite DB and listen for network changes, ONLY for workers.
  useEffect(() => {
    if (userRole === 'worker') {
      getDb(); // Initialize the DB

      const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
        setIsOffline(state.isConnected === false);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [userRole]);

  // Load last checkout data from AsyncStorage on mount
  useEffect(() => {
      const loadLastCheckoutData = async () => {
          const storedAssignmentId = await AsyncStorage.getItem('lastCheckoutAssignmentId');
          const storedDate = await AsyncStorage.getItem('lastCheckoutDate');
          const today = moment().format('YYYY-MM-DD');

          if (storedAssignmentId && storedDate === today) {
              setLastCheckoutAssignmentId(storedAssignmentId);
              setLastCheckoutDate(storedDate);
          } else {
              // Clear if it's a new day or no data
              await AsyncStorage.removeItem('lastCheckoutAssignmentId');
              await AsyncStorage.removeItem('lastCheckoutDate');
              setLastCheckoutAssignmentId(null);
              setLastCheckoutDate(null);
          }
      };
      loadLastCheckoutData();
  }, []);

  // Sync local changes when coming online, ONLY for workers
  useEffect(() => {
    if (userRole === 'worker' && !isOffline && userCompanyId) { // Ensure userCompanyId is available before syncing
      syncLocalChanges();
    }
  }, [userRole, isOffline, userCompanyId]);

  // Determine the last completed sort key when today's sessions change
  useEffect(() => {
    const completedSessions = workSessionsToday
      .filter(ws => ws.end_time && ws.worker_assignments?.sort_key)
      .sort((a, b) => (b.worker_assignments?.sort_key || '').localeCompare(a.worker_assignments?.sort_key || ''));

    if (completedSessions.length > 0) {
      setLastCompletedSortKey(completedSessions[0].worker_assignments!.sort_key);
    } else {
      setLastCompletedSortKey(null);
    }
  }, [workSessionsToday]);

  const syncLocalChanges = useCallback(async () => {
    if (!userCompanyId) return; // Cannot sync without companyId
    console.log("Attempting to sync local changes...");
    try {
      // Sync Location Events
      const unsyncedEvents = await getUnsyncedLocationEvents();
      if (unsyncedEvents.length > 0) {
        console.log(`Found ${unsyncedEvents.length} unsynced location events. Syncing...`);
        await supabase.from('location_events').upsert(unsyncedEvents.map(({ id, synced, ...rest }) => rest));
        const successfullySyncedEventIds = unsyncedEvents.map(e => e.id);
        await markLocationEventsAsSynced(successfullySyncedEventIds);
        console.log(`Synced ${successfullySyncedEventIds.length} local location events.`);
      }

      // Sync Work Sessions
      const unsyncedWorkSessions = await getUnsyncedWorkSessions();
      if (unsyncedWorkSessions.length > 0) {
        console.log(`Found ${unsyncedWorkSessions.length} unsynced work sessions. Syncing...`);
        await upsertWorkSessions(unsyncedWorkSessions);
        const successfullySyncedSessionIds = unsyncedWorkSessions.map(ws => ws.id);
        await markWorkSessionsAsSynced(successfullySyncedSessionIds);
        console.log(`Synced ${successfullySyncedSessionIds.length} local work sessions.`);
      }
      
    } catch (err) {
      console.error("Error during sync:", err);
      setError("Failed to sync local changes.");
    }
  }, [userCompanyId]);


  const loadActiveWorkSession = useCallback(async () => {
    if (!user?.id) {
      setActiveWorkSession(null);
      return;
    }
    setError(null);
    try {
      const session = await fetchActiveWorkSession(user.id);
      setActiveWorkSession(session);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching active work session:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    loadActiveWorkSession();
  }, [loadActiveWorkSession]);

  const loadWorkSessionsForDate = useCallback(
    async (date: string, workerId: string) => {
      if (!userCompanyId) return;
      // No need to set loading state here as it's part of the parent load
      try {
        if (isOffline) {
          console.log("Loading work sessions from local DB (offline)");
          const sessions = await getLocalWorkSessions(workerId, date);
          setWorkSessionsToday(sessions);
        } else {
          console.log("Loading work sessions from Supabase");
          const sessions = await fetchWorkSessionsByDate(workerId, date);
          setWorkSessionsToday(sessions);
          // TODO: Cache these sessions in SQLite
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to fetch work sessions:', err);
      }
    }, [userCompanyId, isOffline]
  );

  useEffect(() => {
    if (user?.id) {
        const today = moment().format('YYYY-MM-DD');
        loadWorkSessionsForDate(today, user.id);
    }
  }, [user?.id, loadWorkSessionsForDate]);



  const loadAssignmentsForDate = useCallback(
    async (date: string, workerIds: string[], forceFetchFromSupabase = false) => {
      if (!userCompanyId || workerIds.length === 0) return;
      setIsLoading(true);
      setError(null);
      try {
        // In parallel, load assignments and today's work sessions for the primary worker
        // This assumes the primary user is the first in the list, which is typical for worker views.
        if (workerIds.length > 0) {
          await loadWorkSessionsForDate(date, workerIds[0]);
        }

        let fetchedAssignments: AssignmentRecord[] = [];

        if (isOffline && !forceFetchFromSupabase) {
          console.log("Loading assignments from local DB (offline)");
          fetchedAssignments = await getLocalAssignments(workerIds[0], date) as AssignmentRecord[];
        } else {
          console.log("Loading assignments from Supabase");
          console.log("DEBUG: Fetching assignments with params:", { userCompanyId, date, workerIds });
          const supabaseAssignments = await fetchAssignmentsForWorkers(userCompanyId, date, workerIds);
          fetchedAssignments = supabaseAssignments as AssignmentRecord[];

          // For workers, update the local DB after fetching from Supabase
          if (userRole === 'worker') {
            const db = await getDb();
            await db.withTransactionAsync(async () => {
              await db.runAsync(`DELETE FROM local_assignments WHERE worker_id = ? AND assigned_date = ?;`, workerIds[0], date);
              for (const assign of fetchedAssignments) {
                await db.runAsync(
                  `INSERT INTO local_assignments (id, company_id, worker_id, assigned_date, sort_key, ref_id, ref_type, start_time, created_at, created_by, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                  [
                    assign.id,
                    assign.company_id,
                    assign.worker_id,
                    assign.assigned_date,
                    assign.sort_key,
                    assign.ref_id,
                    assign.ref_type,
                    assign.start_time || null,
                    assign.created_at,
                    assign.created_by,
                    1
                  ]
                );
              }
            });
          }
        }
        
        setAssignments((prev: AssignmentRecord[]) => {
          const newAssignments = [...prev];
          fetchedAssignments.forEach((fetched: AssignmentRecord) => {
            if (!newAssignments.some((existing: AssignmentRecord) => existing.id === fetched.id)) {
              newAssignments.push(fetched);
            }
          });
          return newAssignments;
        });

      } catch (err: any) {
        console.error("CRITICAL: Error in loadAssignmentsForDate:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [userCompanyId, isOffline, loadWorkSessionsForDate, user]
  );

  const clearAssignments = useCallback(() => {
    setAssignments([]);
  }, []);

  const insertAssignmentStep = useCallback(async (
    record: Omit<AssignmentRecord, 'id' | 'created_at' | 'created_by' | 'company_id'>
  ) => {
    if (!userCompanyId || !user?.id) return;
    const newRecord = {
      ...record,
      id: generateId(),
      company_id: userCompanyId,
      created_by: user.id,
    };
    const inserted = await insertAssignment(newRecord);
    if (inserted) {
      setAssignments(prev => [...prev, inserted]);
    }
  }, [user, userCompanyId]);

  const updateAssignmentSortKey = useCallback(async (id: string, newSortKey: string) => {
    const updated = await updateAssignment(id, { sort_key: newSortKey });
    if (updated) {
      setAssignments(prev => prev.map(a => a.id === id ? updated : a));
    }
  }, []);

  const deleteAssignmentStep = useCallback(async (id: string) => {
    await deleteAssignment(id);
    setAssignments(prev => prev.filter(a => a.id !== id));
  }, []);

  const moveAssignmentBetweenWorkers = useCallback(async (
    id: string,
    newWorkerId: string,
    newSortKey: string
  ) => {
    const updated = await updateAssignment(id, { worker_id: newWorkerId, sort_key: newSortKey });
    if (updated) {
      setAssignments(prev => prev.map(a => a.id === id ? updated : a));
    }
  }, []);

  const updateAssignmentStartTime = useCallback(async (id: string, startTime: string | null) => {
    const updated = await updateAssignment(id, { start_time: startTime });
    if (updated) {
      setAssignments(prev => prev.map(a => a.id === id ? updated : a));
    }
  }, []);

  const startWorkSession = useCallback(async (assignmentId: string, location: { latitude: number; longitude: number }) => {
    if (!user?.id || !userCompanyId) return;

    let session: WorkSession;

    if (isOffline) {
      console.log("Offline: Creating local work session.");
      const now = new Date().toISOString();
      const localSession: WorkSession = {
        id: generateId(),
        created_at: now,
        company_id: userCompanyId,
        worker_id: user.id,
        assignment_id: assignmentId,
        start_time: now,
        end_time: null,
        total_break_minutes: 0,
        synced: false, // Mark as not synced
      };

      try {
        await insertLocalWorkSession(localSession);
        setActiveWorkSession(localSession);
        setWorkSessionsToday(prev => [...prev, localSession]);
        session = localSession;
        console.log("Successfully created local work session.");
      } catch (err) {
        console.error("Failed to create local work session:", err);
        // Re-throw or handle error appropriately for the UI
        throw new Error("Failed to save check-in locally.");
      }
    } else {
      console.log("Online: Creating Supabase work session.");
      try {
        const remoteSession = await insertWorkSession(user.id, assignmentId, userCompanyId);
        if (remoteSession) {
          // Add synced status for UI consistency, though it's implicit
          const onlineSession = { ...remoteSession, synced: true };
          setActiveWorkSession(onlineSession);
          setWorkSessionsToday(prev => [...prev, onlineSession]);
          session = onlineSession;
        } else {
            throw new Error("Failed to create Supabase work session.");
        }
      } catch (err) {
        console.error("Failed to create Supabase work session:", err);
        throw err;
      }
    }

    // After session is created, create location event and start heartbeat
    await startHeartbeatTracking(assignmentId, userCompanyId, user.id);
    
    const locationEvent = {
        company_id: userCompanyId,
        worker_id: user.id,
        assignment_id: assignmentId,
        type: 'enter_geofence',
        latitude: location.latitude,
        longitude: location.longitude,
        notes: 'Checked in',
    };

    if (isOffline) {
        await insertLocalLocationEvent({
            ...locationEvent,
            id: generateId(),
            created_at: new Date().toISOString(),
            synced: 0,
        });
        console.log("Successfully created local 'enter_geofence' event.");
    } else {
        await insertLocationEvent(locationEvent);
        console.log("Successfully created Supabase 'enter_geofence' event.");
    }

  }, [user, userCompanyId, isOffline]);

  const endWorkSession = useCallback(async (sessionId: string, location: { latitude: number; longitude: number }) => {
    if (!user?.id || !userCompanyId) return;

    const sessionToEnd = workSessionsToday.find(s => s.id === sessionId);
    if (!sessionToEnd) {
        console.error("Session to end not found in today's sessions.");
        throw new Error("Session to end not found.");
    }
    
    const locationEvent = {
        company_id: sessionToEnd.company_id,
        worker_id: sessionToEnd.worker_id,
        assignment_id: sessionToEnd.assignment_id,
        type: 'exit_geofence',
        latitude: location.latitude,
        longitude: location.longitude,
        notes: 'Checked out',
    };

    // Stop the heartbeat tracking as soon as checkout is initiated
    await stopHeartbeatTracking();

    if (isOffline) {
        console.log("Offline: Creating local 'exit_geofence' event.");
        await insertLocalLocationEvent({
            ...locationEvent,
            id: generateId(),
            created_at: new Date().toISOString(),
            synced: 0,
        });

        console.log("Offline: Ending local work session.");
        const updatedSession = { ...sessionToEnd, end_time: new Date().toISOString(), synced: false };
        await updateLocalWorkSession(updatedSession);
        
        setActiveWorkSession(null);
        setWorkSessionsToday(prev => prev.map(s => (s.id === sessionId ? updatedSession : s)));
        
        const assignmentId = updatedSession.assignment_id;
        if (assignmentId) {
            setLastCheckoutAssignmentId(assignmentId);
            const today = moment().format('YYYY-MM-DD');
            setLastCheckoutDate(today);
            await AsyncStorage.setItem('lastCheckoutAssignmentId', assignmentId);
            await AsyncStorage.setItem('lastCheckoutDate', today);
        }

    } else {
        console.log("Online: Creating Supabase 'exit_geofence' event.");
        await insertLocationEvent(locationEvent);

        console.log("Online: Ending Supabase work session.");
        const endedSession = await endWorkSessionService(sessionId);
        if (endedSession) {
            setActiveWorkSession(null);
            setWorkSessionsToday(prev => prev.map(s => s.id === sessionId ? endedSession : s));
            const assignmentId = endedSession.assignment_id;
            if (assignmentId) {
                setLastCheckoutAssignmentId(assignmentId);
                const today = moment().format('YYYY-MM-DD');
                setLastCheckoutDate(today);
                await AsyncStorage.setItem('lastCheckoutAssignmentId', assignmentId);
                await AsyncStorage.setItem('lastCheckoutDate', today);
            }
        }
    }
  }, [user, userCompanyId, isOffline, workSessionsToday]);

  const updateWorkSessionAssignment = useCallback(async (sessionId: string, newAssignmentId: string) => {
    const updatedSession = await updateWorkSessionAssignmentService(sessionId, newAssignmentId);
    if (updatedSession) {
      setActiveWorkSession(updatedSession);
      setWorkSessionsToday(prev => prev.map(s => s.id === sessionId ? updatedSession : s));
    }
  }, []);

  const processedAssignments = useMemo(() => {
    const workerAssignments: Record<string, AssignmentRecord[]> = {};
    assignments.forEach(a => {
      if (!workerAssignments[a.worker_id]) {
        workerAssignments[a.worker_id] = [];
      }
      workerAssignments[a.worker_id].push(a);
    });

    const result: Record<string, ProcessedAssignmentStepWithStatus[]> = {};

    for (const workerId in workerAssignments) {
      const sortedAssignments = [...workerAssignments[workerId]].sort((a, b) => a.sort_key.localeCompare(b.sort_key));

      result[workerId] = sortedAssignments.map(assignment => {
        let status: AssignmentStatus = 'pending';
        const isActiveSession = activeWorkSession?.assignment_id === assignment.id;
        const isCompleted = lastCompletedSortKey && assignment.sort_key <= lastCompletedSortKey;

        if (isActiveSession) {
          status = 'active';
        } else if (isCompleted) {
          status = 'completed';
        } else if (lastCompletedSortKey && assignment.sort_key > lastCompletedSortKey) {
          const previousIndex = sortedAssignments.findIndex(a => a.sort_key === lastCompletedSortKey);
          const currentIndex = sortedAssignments.findIndex(a => a.id === assignment.id);
          if (currentIndex === previousIndex + 1) {
            status = 'next';
          }
        } else if (!lastCompletedSortKey && sortedAssignments.indexOf(assignment) === 0) {
          status = 'next';
        }

        const project = allProjects.find(p => p.id === assignment.ref_id && assignment.ref_type === 'project');
        const location = commonLocations.find(l => l.id === assignment.ref_id && assignment.ref_type === 'common_location');

        return {
          ...assignment,
          id: assignment.id,
          title: project?.name || location?.name || 'Unknown',
          type: assignment.ref_type,
          project: project,
          location: location,
          status: status,
        };
      });
    }
    return result;
  }, [assignments, allProjects, commonLocations, activeWorkSession, lastCompletedSortKey]);

  const value = {
    assignments,
    commonLocations,
    isLoading,
    error,
    loadAssignmentsForDate,
    loadWorkSessionsForDate,
    clearAssignments,
    insertAssignmentStep,
    updateAssignmentSortKey,
    deleteAssignmentStep,
    moveAssignmentBetweenWorkers,
    updateAssignmentStartTime,
    activeWorkSession,
    workSessionsToday,
    startWorkSession,
    endWorkSession,
    updateWorkSessionAssignment,
    processedAssignments,
    syncLocalChanges,
    isOffline,
    lastCheckoutAssignmentId,
  };

  return (
    <AssignmentsContext.Provider value={value}>
      {children}
    </AssignmentsContext.Provider>
  );
}
