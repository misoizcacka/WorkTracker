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

    // Helper function to interpolate between two colors
    const interpolateColor = (color1: string, color2: string, factor: number): string => {
      const hex1 = color1.replace('#', '');
      const hex2 = color2.replace('#', '');
      
      const r1 = parseInt(hex1.substring(0, 2), 16);
      const g1 = parseInt(hex1.substring(2, 4), 16);
      const b1 = parseInt(hex1.substring(4, 6), 16);
      
      const r2 = parseInt(hex2.substring(0, 2), 16);
      const g2 = parseInt(hex2.substring(2, 4), 16);
      const b2 = parseInt(hex2.substring(4, 6), 16);
      
      const r = Math.round(r1 + (r2 - r1) * factor);
      const g = Math.round(g1 + (g2 - g1) * factor);
      const b = Math.round(b1 + (b2 - b1) * factor);
      
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };

    // Helper function to get color based on segment progress (not time!)
    const getColorForSegment = (segmentIndex: number, totalSegments: number): string => {
      const progress = segmentIndex / totalSegments;
      
      // Gray → Red → Dark Red
      if (progress < 0.5) {
        // First half: Gray → Red
        const p = progress * 2; // 0 to 1
        return interpolateColor('#9CA3AF', '#EF4444', p);
      } else {
        // Second half: Red → Dark Red
        const p = (progress - 0.5) * 2; // 0 to 1
        return interpolateColor('#EF4444', '#991B1B', p);
      }
    };

    // Create individual line segments with colors
    const totalSegments = sortedLocationEvents.length - 1;
    const features: Feature<LineString>[] = [];
    
    for (let i = 0; i < sortedLocationEvents.length - 1; i++) {
      const start = sortedLocationEvents[i];
      const end = sortedLocationEvents[i + 1];
      
      features.push({
        type: 'Feature',
        properties: {
          color: getColorForSegment(i, totalSegments),
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