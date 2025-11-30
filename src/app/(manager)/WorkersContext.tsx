import React, { createContext, useState, useMemo, useCallback } from 'react';
import { Worker } from '../../types';

type CreateWorkerData = Omit<Worker, 'id' | 'status' | 'role'>;

export interface WorkersContextType {
  workers: Worker[];
  seatLimit: number;
  seatsUsed: number;
  createWorker: (worker: CreateWorkerData) => Worker;
  getWorkerByEmail: (email: string) => Worker | undefined;
  updateWorker: (worker: Worker) => void;
  deleteWorker: (workerId: string) => void;
  getWorkerById: (workerId: string) => Worker | undefined;
}

export const WorkersContext = createContext<WorkersContextType | null>(null);

const MOCK_WORKERS: Worker[] = [
    { id: '1', full_name: 'John Doe', email: 'john@work.com', phone_number: '123-456-7890', role:'worker', status:'active', avatar: 'https://i.imgur.com/DkSvfK0.png', location: { latitude: 52.5200, longitude: 13.4050 }, joined_at: '2023-01-15', reporting_to: '8' },
    { id: '2', full_name: 'Sarah Lee', email: 'sarah@work.com', phone_number: '123-456-7890', role:'worker', status:'active', avatar: 'https://i.imgur.com/GckJB1a.png', location: { latitude: 52.5300, longitude: 13.4150 }, joined_at: '2023-02-20', reporting_to: '8' },
    { id: '3', full_name: 'Tom Hanks', email: 'tom@work.com', phone_number: '123-456-7890', role:'worker', status:'active', avatar: 'https://i.imgur.com/qirZ3E6.png', location: { latitude: 52.5100, longitude: 13.3850 }, joined_at: '2023-03-10', reporting_to: '8' },
    { id: '4', full_name: 'Julia Roberts', email: 'julia@work.com', phone_number: '123-456-7890', role:'worker', status:'active', avatar: 'https://i.imgur.com/keD0fuz.png', location: { latitude: 52.5150, longitude: 13.4250 }, joined_at: '2023-04-05', reporting_to: '8' },
    { id: '5', full_name: 'Robert De Niro', email: 'robert@work.com', phone_number: '123-456-7890', role:'worker', status:'active', avatar: 'https://i.imgur.com/ywYuPSt.png', location: { latitude: 52.5250, longitude: 13.3950 }, joined_at: '2023-05-25', reporting_to: '8' },
    { id: '6', full_name: 'Meryl Streep', email: 'meryl@work.com', phone_number: '123-456-7890', role:'worker', status:'active', avatar: 'https://i.imgur.com/cgtGgBw.png', location: { latitude: 52.5050, longitude: 13.4350 }, joined_at: '2023-06-18', reporting_to: '8' },
    { id: '7', full_name: 'Morgan Freeman', email: 'morgan@work.com', phone_number: '123-456-7890', role:'worker', status:'pending', avatar: 'https://i.imgur.com/hj422E8.png', location: { latitude: 52.5350, longitude: 13.4000 }, joined_at: '2023-07-01', reporting_to: '8' },
    { id: '8', full_name: 'John Manager', email: 'manager@work.com', phone_number: '123-456-7890', role:'manager', status:'active', avatar: 'https://i.imgur.com/DkSvfK0.png', location: { latitude: 52.5200, longitude: 13.4050 }, joined_at: '2023-01-10' },
];

export function WorkersProvider({ children }: { children: React.ReactNode }) {
  const [workers, setWorkers] = useState<Worker[]>(MOCK_WORKERS);
  const seatLimit = 10;

  const seatsUsed = useMemo(() => workers.filter(w => w.role === 'worker' && (w.status === 'active' || w.status === 'pending')).length, [workers]);

  const createWorker = useCallback((workerData: CreateWorkerData): Worker => {
    const newWorker: Worker = {
      ...workerData,
      id: (workers.length + 1).toString(),
      status: 'active',
      role: 'worker',
      avatar: `https://i.imgur.com/1nSAQlW.png`,
    };
    setWorkers(prevWorkers => [...prevWorkers, newWorker]);
    return newWorker;
  }, [workers.length]);

  const getWorkerByEmail = useCallback((email: string) => {
    return workers.find(worker => worker.email === email);
  }, [workers]);

  const getWorkerById = useCallback((workerId: string) => {
    return workers.find(worker => worker.id === workerId);
  }, [workers]);

    const updateWorker = useCallback((updatedWorker: Worker) => {
      setWorkers(prevWorkers =>
        prevWorkers.map(worker =>
          worker.id === updatedWorker.id ? updatedWorker : worker
        )
      );
    }, []);
    const deleteWorker = useCallback((workerId: string) => {
      setWorkers(prevWorkers =>
        prevWorkers.filter(worker => worker.id !== workerId)
      );
    }, []);
  const value = useMemo(() => ({
    workers,
    seatLimit,
    seatsUsed,
    createWorker,
    getWorkerByEmail,
    updateWorker,
    deleteWorker,
    getWorkerById
  }), [workers, seatLimit, seatsUsed, createWorker, getWorkerByEmail, updateWorker, deleteWorker, getWorkerById]);

  return (
    <WorkersContext.Provider value={value}>
      {children}
    </WorkersContext.Provider>
  );
}