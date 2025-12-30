import moment from 'moment';

export function isSameDay(date1: Date, date2: Date): boolean {
  return moment(date1).isSame(date2, 'day');
}