import moment from 'moment';
import { Assignment } from '../types';

export function hasConflict(newAssignment: Assignment, existingAssignments: Assignment[]): boolean {
  const newStart = moment(newAssignment.startDate);
  const newEnd = moment(newAssignment.endDate);

  for (const existing of existingAssignments) {
    // Skip checking against itself if it's an update
    if (existing.id === newAssignment.id) {
      continue;
    }

    const existingStart = moment(existing.startDate);
    const existingEnd = moment(existing.endDate);

    // Check for overlap
    // Case 1: New assignment starts during existing assignment
    // Case 2: New assignment ends during existing assignment
    // Case 3: Existing assignment starts during new assignment
    // Case 4: Existing assignment ends during new assignment
    if (
      (newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart))
    ) {
      return true;
    }
  }
  return false;
}