import moment from 'moment';
import { Assignment } from './project-assignment-types';

export function isSameDay(date1: Date, date2: Date): boolean {
  return moment(date1).isSame(date2, 'day');
}

export function calculateStackedAssignments(baseAssignments: Assignment[], startTime: Date): Assignment[] {
    if (baseAssignments.length === 0) return [];

    let currentMoment = moment(startTime);
    return baseAssignments.map((assign) => {
      const durationMinutes = moment(assign.endDate).diff(moment(assign.startDate), 'minutes'); // Use existing duration
      const newStartDate = currentMoment.toDate();
      const newEndDate = moment(newStartDate).add(durationMinutes, 'minutes').toDate();
      currentMoment = moment(newEndDate);
      return { ...assign, startDate: newStartDate, endDate: newEndDate };
    });
}