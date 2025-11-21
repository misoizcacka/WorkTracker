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
    { id: '1', full_name: 'John Doe', email: 'john@work.com', role:'worker', status:'active', avatar: 'https://i.imgur.com/DkSvfK0.png' },
    { id: '2', full_name: 'Sarah Lee', email: 'sarah@work.com', role:'worker', status:'active', avatar: 'https://i.imgur.com/GckJB1a.png' },
    { id: '3', full_name: 'Tom Hanks', email: 'tom@work.com', role:'worker', status:'active', avatar: 'https://i.imgur.com/qirZ3E6.png' },
    { id: '4', full_name: 'Julia Roberts', email: 'julia@work.com', role:'worker', status:'active', avatar: 'https://i.imgur.com/keD0fuz.png' },
    { id: '5', full_name: 'Robert De Niro', email: 'robert@work.com', role:'worker', status:'active', avatar: 'https://i.imgur.com/ywYuPSt.png' },
    { id: '6', full_name: 'Meryl Streep', email: 'meryl@work.com', role:'worker', status:'active', avatar: 'https://i.imgur.com/cgtGgBw.png' },
    { id: '7', full_name: 'Morgan Freeman', email: 'morgan@work.com', role:'worker', status:'pending', avatar: 'https://i.imgur.com/hj422E8.png' },
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