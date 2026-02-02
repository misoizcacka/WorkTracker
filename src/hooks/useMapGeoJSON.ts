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
}

export interface LocationEvent {
  lat: number;
  lng: number;
  timestamp: string; // ISO string
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
}

export const useMapGeoJSON = ({ assignments, locationEvents, reportDate }: UseMapGeoJSONProps): UseMapGeoJSONResult => {
  const assignmentPointsGeoJSON: FeatureCollection<Point> = useMemo(() => {
    const features: Feature<Point>[] = assignments.map((assignment, index) => ({
      type: 'Feature',
      properties: {
        id: assignment.id,
        name: assignment.name,
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

    const coordinates = sortedLocationEvents.map(event => [event.lng, event.lat]);

    if (coordinates.length === 0) {
      return {
        type: 'FeatureCollection',
        features: [],
      };
    }

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            name: 'Worker Full Trail',
          },
          geometry: {
            type: 'LineString',
            coordinates: coordinates,
          },
        },
      ],
    };
  }, [locationEvents]);

  return { assignmentPointsGeoJSON, assignmentSegmentsGeoJSON, fullTrailGeoJSON };
};