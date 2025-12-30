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
} from '../services/workSessions';
import { useSession } from '~/context/AuthContext';
import { useProjects } from '~/context/ProjectsContext';
import {
  getDb,
  insertLocalAssignment, getLocalAssignments,
  insertLocalWorkSession, updateLocalWorkSession,
  insertLocalLocationEvent, getUnsyncedLocationEvents, markLocationEventsAsSynced,
  getLocalWorkSessions,
} from '~/db/database';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import * as SQLite from 'expo-sqlite'; // Import SQLite for typing (though no longer SQLiteTransaction)
import { TransitionEventType } from '~/utils/localTransitionEvents';

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
  startWorkSession: (assignmentId: string) => Promise<void>;
  endWorkSession: (sessionId: string) => Promise<void>;
  updateWorkSessionAssignment: (sessionId: string, newAssignmentId: string) => Promise<void>;

  // Offline-First
  syncLocalChanges: () => Promise<void>;
  isOffline: boolean;
}

export const AssignmentsContext = React.createContext<AssignmentsContextType | null>(null);

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
      const successfullySyncedEventIds: number[] = [];
      for (const event of unsyncedEvents) {
        // Here you would typically send these events to your Supabase backend
        // For this example, we'll just log and assume success
        console.log("Syncing local event:", event);
        // await supabase.from('location_events').insert({ ...event, synced: true }); // Example
        successfullySyncedEventIds.push(event.id);
      }
      if (successfullySyncedEventIds.length > 0) {
        await markLocationEventsAsSynced(successfullySyncedEventIds);
        console.log(`Synced ${successfullySyncedEventIds.length} local location events.`);
      }

      // TODO: Implement sync for local_assignments and local_work_sessions
      // This is a complex step involving conflict resolution and would be part of a full offline-first implementation.
      // For now, we prioritize syncing events.
      
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

  const loadInitialLocations = useCallback(async () => {
    if (!userCompanyId) return;
    try {
      const locations = await fetchCommonLocations();
      setCommonLocations(locations || []);
    } catch (err: any) {
      console.error('Failed to fetch common locations:', err);
    }
  }, [userCompanyId]);

  useEffect(() => {
    loadInitialLocations();
  }, [loadInitialLocations]);

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
    [userCompanyId, isOffline, loadWorkSessionsForDate]
  );

  const clearAssignments = useCallback(() => {
    setAssignments([]);
  }, []);

  const insertAssignmentStep = useCallback(
    async (record: Omit<AssignmentRecord, 'id' | 'created_at' | 'created_by' | 'company_id'>) => {
      if (!user || !userCompanyId) return;

      setIsLoading(true);
      setError(null);
      const newAssignmentRecord: AssignmentRecord = {
        ...record,
        id: `local-${Math.random().toString(36).substring(2, 9)}`, // Generate local ID
        created_by: user.id,
        company_id: userCompanyId,
        created_at: new Date().toISOString(),
        synced: false,
      };

      try {
        console.log("insertAssignmentStep: Entered try block.");
        if (userRole === 'worker') {
          await insertLocalAssignment(newAssignmentRecord); // Save to local DB first
        }
        setAssignments((prev: AssignmentRecord[]) => [...prev, newAssignmentRecord]);

        if (!isOffline) {
          console.log("insertAssignmentStep: Attempting to insert into Supabase.");
          const supabaseRecord = await insertAssignment(newAssignmentRecord);
          if (supabaseRecord) {
            console.log("insertAssignmentStep: Supabase insert successful, updating local state with new ID.");
            if (userRole === 'worker') {
              // Update local record ID and mark as synced
              const db = await getDb();
              await db.runAsync(`UPDATE local_assignments SET id = ?, synced = 1 WHERE id = ?`, [supabaseRecord.id, newAssignmentRecord.id]);
            }
            setAssignments((prev: AssignmentRecord[]) =>
              prev.map(assign => assign.id === newAssignmentRecord.id ? { ...assign, id: supabaseRecord.id, synced: true } : assign)
            );
          }
        }
      } catch (err: any) {
        console.error("CRITICAL: Error in insertAssignmentStep:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [user, userCompanyId, isOffline]
  );

  const updateAssignmentSortKey = useCallback(
    async (id: string, newSortKey: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const db = await getDb();
        await db.runAsync(`UPDATE local_assignments SET sort_key = ?, synced = 0 WHERE id = ?`, [newSortKey, id]); // Update local, mark unsynced
        setAssignments((prev: AssignmentRecord[]) =>
          prev.map((assign: AssignmentRecord) => (assign.id === id ? { ...assign, sort_key: newSortKey, synced: false } : assign))
        );

        if (!isOffline) {
          const updatedRecord = await updateAssignment(id, { sort_key: newSortKey });
          if (updatedRecord) {
            await db.runAsync(`UPDATE local_assignments SET synced = 1 WHERE id = ?`, [id]);
            setAssignments((prev: AssignmentRecord[]) =>
              prev.map((assign: AssignmentRecord) => (assign.id === id ? { ...assign, synced: true } : assign))
            );
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [isOffline]
  );

  const updateAssignmentStartTime = useCallback(
    async (id: string, startTime: string | null) => {
      setIsLoading(true);
      setError(null);
      try {
        const db = await getDb();
        await db.runAsync(`UPDATE local_assignments SET start_time = ?, synced = 0 WHERE id = ?`, [startTime, id]); // Update local, mark unsynced
        setAssignments((prev: AssignmentRecord[]) =>
          prev.map((assign: AssignmentRecord) => (assign.id === id ? { ...assign, start_time: startTime, synced: false } : assign))
        );

        if (!isOffline) {
          const updatedRecord = await updateAssignment(id, { start_time: startTime });
          if (updatedRecord) {
            await db.runAsync(`UPDATE local_assignments SET synced = 1 WHERE id = ?`, [id]);
            setAssignments((prev: AssignmentRecord[]) =>
              prev.map((assign: AssignmentRecord) => (assign.id === id ? { ...assign, synced: true } : assign))
            );
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [isOffline]
  );
  
  const deleteAssignmentStep = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const db = await getDb();
        // Mark for deletion or just delete locally for now, and ensure it's removed from Supabase
        await db.runAsync(`DELETE FROM local_assignments WHERE id = ?`, [id]); // Local delete
        setAssignments((prev: AssignmentRecord[]) => prev.filter((assign: AssignmentRecord) => assign.id !== id));

        if (!isOffline) {
          await deleteAssignment(id);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [isOffline]
  );

  const moveAssignmentBetweenWorkers = useCallback(
    async (id: string, newWorkerId: string, newSortKey: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const db = await getDb();
        await db.runAsync(`UPDATE local_assignments SET worker_id = ?, sort_key = ?, synced = 0 WHERE id = ?`, [newWorkerId, newSortKey, id]); // Update local, mark unsynced
        setAssignments((prev: AssignmentRecord[]) =>
          prev.map((assign: AssignmentRecord) =>
            assign.id === id ? { ...assign, worker_id: newWorkerId, sort_key: newSortKey, synced: false } : assign
          )
        );

        if (!isOffline) {
          const updatedRecord = await updateAssignment(id, {
            worker_id: newWorkerId,
            sort_key: newSortKey,
          });
          if (updatedRecord) {
            await db.runAsync(`UPDATE local_assignments SET synced = 1 WHERE id = ?`, [id]);
            setAssignments((prev: AssignmentRecord[]) => (prev.map(assign => assign.id === id ? { ...assign, synced: true } : assign)));
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [isOffline]
  );

  // Work Session Actions
  const startWorkSession = useCallback(async (assignmentId: string) => {
    if (!user?.id || !userCompanyId) return;
    setIsLoading(true);
setError(null);
    
    // Frontend validation before calling backend
    const { error: rpcError } = await supabase.rpc('is_valid_checkin_assignment', {
      p_worker_id: user.id,
      p_assignment_id: assignmentId,
    });

    if (rpcError) {
      setError("This is not the correct assignment to start.");
      console.error("RPC validation failed:", rpcError);
      setIsLoading(false);
      return;
    }

    const newSessionRecord: WorkSession = {
      id: `local-ws-${Math.random().toString(36).substring(2, 9)}`, // Local ID
      created_at: new Date().toISOString(),
      company_id: userCompanyId,
      worker_id: user.id,
      assignment_id: assignmentId,
      start_time: new Date().toISOString(),
      end_time: null,
      total_break_minutes: 0,
      synced: false,
    };
    try {
      await insertLocalWorkSession(newSessionRecord); // Save to local DB first
      setActiveWorkSession(newSessionRecord);

      if (!isOffline) {
        const supabaseSession = await insertWorkSession(user.id, assignmentId, userCompanyId);
        if (supabaseSession) {
          // Update local record ID and mark as synced
          const db = await getDb();
          await db.runAsync(`UPDATE local_work_sessions SET id = ?, synced = 1 WHERE id = ?`, [supabaseSession.id, newSessionRecord.id]);
          setActiveWorkSession({ ...supabaseSession, synced: true });
        }
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error starting work session:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, userCompanyId, isOffline]);

  const endWorkSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // For workers with local DB, mark the session as ended.
      if (userRole === 'worker') {
        const db = await getDb();
        await db.runAsync(`UPDATE local_work_sessions SET end_time = ?, synced = 0 WHERE id = ?`, [new Date().toISOString(), sessionId]);
      }
      
      // If online, send the update to the backend.
      if (!isOffline) {
        await endWorkSessionService(sessionId);
      }

      // After successfully ending the session, clear it from the app state.
      setActiveWorkSession(null);

    } catch (err: any) {
      console.error('Error ending work session:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isOffline, userRole]);

  const updateWorkSessionAssignment = useCallback(async (sessionId: string, newAssignmentId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const db = await getDb();
      await db.runAsync(`UPDATE local_work_sessions SET assignment_id = ?, synced = 0 WHERE id = ?`, [newAssignmentId, sessionId]); // Update local, mark unsynced
      setActiveWorkSession((prev: WorkSession | null) => prev ? { ...prev, assignment_id: newAssignmentId, synced: false } : null); // Update local state

      if (!isOffline) {
        const session = await updateWorkSessionAssignmentService(sessionId, newAssignmentId);
        if (session) {
          await db.runAsync(`UPDATE local_work_sessions SET synced = 1 WHERE id = ?`, [sessionId]);
          setActiveWorkSession((prev: WorkSession | null) => prev ? { ...prev, synced: true } : null);
        }
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating work session assignment:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isOffline]);


  const processedAssignments = useMemo((): Record<string, ProcessedAssignmentStepWithStatus[]> => {
    const result: Record<string, ProcessedAssignmentStepWithStatus[]> = {};
    
    const groupedAssignments = assignments.reduce((acc: Record<string, AssignmentRecord[]>, assignment: AssignmentRecord) => {
      if (!acc[assignment.worker_id]) {
        acc[assignment.worker_id] = [];
      }
      acc[assignment.worker_id].push(assignment);
      return acc;
    }, {} as Record<string, AssignmentRecord[]>);

    for (const workerId in groupedAssignments) {
        const workerAssignments = groupedAssignments[workerId].sort((a: AssignmentRecord, b: AssignmentRecord) => a.sort_key.localeCompare(b.sort_key));

        let nextAssignmentMarked = false;
        result[workerId] = workerAssignments.map((record: AssignmentRecord) => {
            let status: AssignmentStatus;

            if (activeWorkSession?.assignment_id === record.id) {
                status = 'active';
            } else if (lastCompletedSortKey && record.sort_key < lastCompletedSortKey) {
                status = 'completed';
            } else if (!activeWorkSession && !nextAssignmentMarked && (!lastCompletedSortKey || record.sort_key >= lastCompletedSortKey)) {
                status = 'next';
                nextAssignmentMarked = true;
            } else {
                status = 'pending';
            }

            const processedStep: ProcessedAssignmentStep | null = record.ref_type === 'project'
              ? {
                  id: record.id,
                  sort_key: record.sort_key,
                  ref_id: record.ref_id,
                  ref_type: record.ref_type,
                  start_time: record.start_time,
                  type: 'project',
                  project: allProjects.find(p => p.id === record.ref_id),
                }
              : {
                  id: record.id,
                  sort_key: record.sort_key,
                  ref_id: record.ref_id,
                  ref_type: record.ref_type,
                  start_time: record.start_time,
                  type: 'common_location',
                  location: commonLocations.find(l => l.id === record.ref_id),
                };
            
            return { ...processedStep, status };
        }).filter(Boolean) as ProcessedAssignmentStepWithStatus[];
    }
    
    return result;
  }, [assignments, allProjects, commonLocations, activeWorkSession, lastCompletedSortKey]);

  const value: AssignmentsContextType = {
    processedAssignments,
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

    syncLocalChanges,
    isOffline,
  };

  return (
    <AssignmentsContext.Provider value={value}>
      {children}
    </AssignmentsContext.Provider>
  );
}

export const useAssignments = () => {
  const context = useContext(AssignmentsContext);
  if (!context) {
    throw new Error('useAssignments must be used within an AssignmentsProvider');
  }
  return context;
};