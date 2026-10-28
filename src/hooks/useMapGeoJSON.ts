import { useMemo } from 'react';
import { FeatureCollection, Point, LineString, Feature } from 'geojson';
import moment from 'moment';

// Define interfaces for inputs as specified by the user
export interface Assignment {
  id: string;
  lat: number;
  lng: number;
  startTime: string; // ISO string
  endTime: string; // ISO string
  sortKey: number;
  name: string; // Assuming name is needed for point properties
  address?: string;
  totalDurationMinutes?: number;
  visits?: {
    startTime: string;
    endTime: string;
    isStillThere?: boolean;
  }[];
}

export interface LocationEvent {
  lat: number;
  lng: number;
  timestamp: string; // ISO string
  type: string;
}

interface UseMapGeoJSONProps {
  assignments: Assignment[];
  locationEvents: LocationEvent[];
  reportDate: Date; // Needed for handling un-ended assignments
}

interface UseMapGeoJSONResult {
  assignmentPointsGeoJSON: FeatureCollection<Point>;
  assignmentSegmentsGeoJSON: FeatureCollection<LineString>;
  fullTrailGeoJSON: FeatureCollection<LineString>;
  trackingDotsGeoJSON: FeatureCollection<Point>;
}

export const useMapGeoJSON = ({ assignments, locationEvents, reportDate }: UseMapGeoJSONProps): UseMapGeoJSONResult => {
  const trackingDotsGeoJSON: FeatureCollection<Point> = useMemo(() => {
    const features: Feature<Point>[] = locationEvents
      .filter(event => event.type !== 'enter_geofence' && event.type !== 'exit_geofence')
      .map(event => ({
        type: 'Feature',
        properties: {
          type: event.type,
          timestamp: event.timestamp
        },
        geometry: {
          type: 'Point',
          coordinates: [event.lng, event.lat],
        },
      }));
    return {
      type: 'FeatureCollection',
      features: features,
    };
  }, [locationEvents]);

  const assignmentPointsGeoJSON: FeatureCollection<Point> = useMemo(() => {
    const features: Feature<Point>[] = assignments.map((assignment, index) => ({
      type: 'Feature',
      properties: {
        id: assignment.id,
        name: assignment.name,
        address: assignment.address || '',
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        assignmentOrder: index + 1, // 1-based index
      },
      geometry: {
        type: 'Point',
        coordinates: [assignment.lng, assignment.lat],
      },
    }));
    return {
      type: 'FeatureCollection',
      features: features,
    };
  }, [assignments]);

  const assignmentSegmentsGeoJSON: FeatureCollection<LineString> = useMemo(() => {
    const features: Feature<LineString>[] = [];
    for (let i = 0; i < assignments.length - 1; i++) {
      const currentAssignment = assignments[i];
      const nextAssignment = assignments[i + 1];

      const segmentEvents = locationEvents.filter(event => {
        const eventTime = new Date(event.timestamp).getTime();
        const endTime = new Date(currentAssignment.endTime).getTime();
        const nextStartTime = new Date(nextAssignment.startTime).getTime();
        return eventTime >= endTime && eventTime <= nextStartTime;
      }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()); // Ensure chronological order

      if (segmentEvents.length > 1) {
        features.push({
          type: 'Feature',
          properties: {
            fromAssignment: i,
            toAssignment: i + 1,
            fromAssignmentName: currentAssignment.name,
            toAssignmentName: nextAssignment.name,
          },
          geometry: {
            type: 'LineString',
            coordinates: segmentEvents.map(event => [event.lng, event.lat]),
          },
        });
      }
    }
    return {
      type: 'FeatureCollection',
      features: features,
    };
  }, [assignments, locationEvents]);

  const fullTrailGeoJSON: FeatureCollection<LineString> = useMemo(() => {
    // Sort all location events chronologically
    const sortedLocationEvents = [...locationEvents].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    if (sortedLocationEvents.length < 2) {
      return {
        type: 'FeatureCollection',
        features: [],
      };
    }

    // Get time range for gradient calculation
    const firstTime = new Date(sortedLocationEvents[0].timestamp).getTime();
    const lastTime = new Date(sortedLocationEvents[sortedLocationEvents.length - 1].timestamp).getTime();
    
    // Helper function to get color based on time progress
    const getColorForTime = (timestamp: string): string => {
      const eventTime = new Date(timestamp).getTime();
      const progress = (eventTime - firstTime) / (lastTime - firstTime);
      
      if (progress < 0.33) return '#9CA3AF'; // Light gray (morning)
      if (progress < 0.66) return '#EF4444'; // Bright red (midday)
      return '#991B1B'; // Dark red (evening)
    };

    // Create individual line segments with colors
    const features: Feature<LineString>[] = [];
    for (let i = 0; i < sortedLocationEvents.length - 1; i++) {
      const start = sortedLocationEvents[i];
      const end = sortedLocationEvents[i + 1];
      
      features.push({
        type: 'Feature',
        properties: {
          color: getColorForTime(start.timestamp),
          timestamp: start.timestamp,
          type: start.type,
        },
        geometry: {
          type: 'LineString',
          coordinates: [[start.lng, start.lat], [end.lng, end.lat]],
        },
      });
    }

    return {
      type: 'FeatureCollection',
      features: features,
    };
  }, [locationEvents]);

  return { assignmentPointsGeoJSON, assignmentSegmentsGeoJSON, fullTrailGeoJSON, trackingDotsGeoJSON };
};