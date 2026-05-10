import { getDistance } from 'geolib';
import { v4 as randomUUID } from 'uuid';
import { LocationEventRecord } from '~/services/locationEvents';

export interface AssignmentGeofenceTarget {
  assignmentId: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface CheckoutPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface DeriveMissingGeofenceEventsParams {
  workerId: string;
  companyId: string;
  geofences: AssignmentGeofenceTarget[];
  timelineEvents: LocationEventRecord[];
  checkoutPoint?: CheckoutPoint;
}

const TRANSITION_EVENT_TYPES = new Set(['enter_geofence', 'exit_geofence']);
const TRACKING_EVENT_TYPES = new Set(['active_tracking', 'passive_tracking', 'periodic_update']);

function isInsideGeofence(
  point: { latitude: number; longitude: number },
  geofence: AssignmentGeofenceTarget
) {
  return getDistance(point, { latitude: geofence.latitude, longitude: geofence.longitude }) <= geofence.radius;
}

function buildDerivedEvent(
  workerId: string,
  companyId: string,
  assignmentId: string,
  type: 'enter_geofence' | 'exit_geofence',
  createdAt: string,
  latitude: number,
  longitude: number,
  notes: string
): LocationEventRecord {
  return {
    id: randomUUID(),
    created_at: createdAt,
    company_id: companyId,
    worker_id: workerId,
    assignment_id: assignmentId,
    type,
    latitude,
    longitude,
    notes,
  };
}

export function deriveMissingGeofenceEvents({
  workerId,
  companyId,
  geofences,
  timelineEvents,
  checkoutPoint,
}: DeriveMissingGeofenceEventsParams): LocationEventRecord[] {
  const chronologicalEvents = [...timelineEvents]
    .filter(event =>
      TRANSITION_EVENT_TYPES.has(event.type) ||
      TRACKING_EVENT_TYPES.has(event.type)
    )
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const derivedEvents: LocationEventRecord[] = [];

  for (const geofence of geofences) {
    const assignmentEvents = chronologicalEvents.filter(event => event.assignment_id === geofence.assignmentId);
    const hasEnter = assignmentEvents.some(event => event.type === 'enter_geofence');
    const hasExit = assignmentEvents.some(event => event.type === 'exit_geofence');

    if (hasEnter && hasExit) {
      continue;
    }

    const firstInsideSample = chronologicalEvents.find(event =>
      isInsideGeofence({ latitude: event.latitude, longitude: event.longitude }, geofence)
    );

    let entryReferenceTime = hasEnter
      ? assignmentEvents.find(event => event.type === 'enter_geofence')?.created_at ?? null
      : firstInsideSample?.created_at ?? null;

    if (!hasEnter && firstInsideSample) {
      derivedEvents.push(
        buildDerivedEvent(
          workerId,
          companyId,
          geofence.assignmentId,
          'enter_geofence',
          firstInsideSample.created_at,
          firstInsideSample.latitude,
          firstInsideSample.longitude,
          'Derived during reconciliation from recorded path.'
        )
      );
    }

    if (hasExit || !entryReferenceTime) {
      continue;
    }

    const exitSample = chronologicalEvents.find(event =>
      new Date(event.created_at).getTime() > new Date(entryReferenceTime).getTime() &&
      !isInsideGeofence({ latitude: event.latitude, longitude: event.longitude }, geofence)
    );

    if (exitSample) {
      derivedEvents.push(
        buildDerivedEvent(
          workerId,
          companyId,
          geofence.assignmentId,
          'exit_geofence',
          exitSample.created_at,
          exitSample.latitude,
          exitSample.longitude,
          'Derived during reconciliation from recorded path.'
        )
      );
      continue;
    }

    if (
      checkoutPoint &&
      new Date(checkoutPoint.timestamp).getTime() > new Date(entryReferenceTime).getTime() &&
      !isInsideGeofence(checkoutPoint, geofence)
    ) {
      derivedEvents.push(
        buildDerivedEvent(
          workerId,
          companyId,
          geofence.assignmentId,
          'exit_geofence',
          checkoutPoint.timestamp,
          checkoutPoint.latitude,
          checkoutPoint.longitude,
          'Derived during checkout reconciliation from recorded path.'
        )
      );
    }
  }

  return derivedEvents;
}
