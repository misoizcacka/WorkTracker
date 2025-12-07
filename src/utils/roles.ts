import { Employee } from '../types';

export const isWorker = (employee: Employee | null | undefined): boolean => {
  return employee?.role === 'worker';
};

export const isManager = (employee: Employee | null | undefined): boolean => {
  return employee?.role === 'manager' || employee?.role === 'owner';
};

export const isOwner = (employee: Employee | null | undefined): boolean => {
  return employee?.role === 'owner';
};
