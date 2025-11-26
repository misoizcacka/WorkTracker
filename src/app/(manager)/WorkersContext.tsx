import React, { createContext, useState, useMemo, useCallback } from 'react';
import { Worker } from '../../types';

type CreateWorkerData = Omit<Worker, 'id' | 'status' | 'role'>;

interface WorkersContextType {
  workers: Worker[];
  seatLimit: number;
  seatsUsed: number;
  createWorker: (worker: CreateWorkerData) => Worker;
  getWorkerByEmail: (email: string) => Worker | undefined;
}

export const WorkersContext = createContext<WorkersContextType | null>(null);

const MOCK_WORKERS: Worker[] = [
    { id: '1', full_name: 'John Doe', email: 'john@work.com', role:'worker', status:'active', avatar: 'https://i.imgur.com/DkSvfK0.png', location: { latitude: 52.5200, longitude: 13.4050 } },
    { id: '2', full_name: 'Sarah Lee', email: 'sarah@work.com', role:'worker', status:'active', avatar: 'https://i.imgur.com/GckJB1a.png', location: { latitude: 52.5300, longitude: 13.4150 } },
    { id: '3', full_name: 'Tom Hanks', email: 'tom@work.com', role:'worker', status:'active', avatar: 'https://i.imgur.com/qirZ3E6.png', location: { latitude: 52.5100, longitude: 13.3850 } },
    { id: '4', full_name: 'Julia Roberts', email: 'julia@work.com', role:'worker', status:'active', avatar: 'https://i.imgur.com/keD0fuz.png', location: { latitude: 52.5150, longitude: 13.4250 } },
    { id: '5', full_name: 'Robert De Niro', email: 'robert@work.com', role:'worker', status:'active', avatar: 'https://i.imgur.com/ywYuPSt.png', location: { latitude: 52.5250, longitude: 13.3950 } },
    { id: '6', full_name: 'Meryl Streep', email: 'meryl@work.com', role:'worker', status:'active', avatar: 'https://i.imgur.com/cgtGgBw.png', location: { latitude: 52.5050, longitude: 13.4350 } },
    { id: '7', full_name: 'Morgan Freeman', email: 'morgan@work.com', role:'worker', status:'pending', avatar: 'https://i.imgur.com/hj422E8.png', location: { latitude: 52.5350, longitude: 13.4000 } },
];

export function WorkersProvider({ children }: { children: React.ReactNode }) {
  const [workers, setWorkers] = useState<Worker[]>(MOCK_WORKERS);
  const seatLimit = 10;

  const seatsUsed = useMemo(() => workers.filter(w => w.status === 'active' || w.status === 'pending').length, [workers]);

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

  const value = useMemo(() => ({
    workers,
    seatLimit,
    seatsUsed,
    createWorker,
    getWorkerByEmail
  }), [workers, seatLimit, seatsUsed, createWorker, getWorkerByEmail]);

  return (
    <WorkersContext.Provider value={value}>
      {children}
    </WorkersContext.Provider>
  );
}