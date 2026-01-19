import { insertLocalLocationEvent } from '~/db/database';

export type TransitionEventType = 'enter_geofence' | 'exit_geofence' | 'periodic_update';

interface TransitionEvent {
  timestamp: string;
  type: TransitionEventType;
  assignmentId: string;
  workerId: string;
  location: { latitude: number; longitude: number };
  notes?: string;
}

export async function saveLocalTransitionEvent(event: TransitionEvent) {
  try {
    console.log(`[SAVING LOCAL EVENT - ${event.type.toUpperCase()}]`, event);
    await insertLocalLocationEvent({
      timestamp: event.timestamp,
      type: event.type,
      assignment_id: event.assignmentId,
      worker_id: event.workerId,
      latitude: event.location.latitude,
      longitude: event.location.longitude,
      notes: event.notes,
      synced: 0, // Mark as not synced
    });
  } catch (err) {
    console.error("Failed to save local transition event:", err);
  }
}
