// Placeholder for local storage/emission of transition events.
// In a full offline-first implementation, this would save to a local database (e.g., SQLite).
// For now, it logs to the console.
export type TransitionEventType = 'enter_geofence' | 'exit_geofence';

interface TransitionEvent {
  timestamp: string;
  type: TransitionEventType;
  assignmentId: string;
  workerId: string;
  location: { latitude: number; longitude: number };
  notes?: string;
}

export function saveLocalTransitionEvent(event: TransitionEvent) {
  console.log(`[LOCAL EVENT - ${event.type.toUpperCase()}]`, event);
  // TODO: In a real offline-first scenario, save this event to local storage (e.g., SQLite)
  // And implement a synchronization mechanism to push these events to the backend when online.
}