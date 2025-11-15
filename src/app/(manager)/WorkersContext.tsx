import React, { useState } from 'react';

export interface Worker {
  id: string;
  name: string;
  project: string;
  status: 'onSite' | 'offSite' | 'notCheckedIn';
  hours: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  avatar?: string;
  lastSeen?: string;
  address?: string;
  email?: string;
  password?: string;
}

export const WorkersContext = React.createContext<{
  workers: Worker[];
  addWorker: (worker: Worker) => void;
} | null>(null);

export function WorkersProvider({ children }: { children: React.ReactNode }) {
  const [workers, setWorkers] = useState<Worker[]>([
    { id: "1", name: "John Worker", project: "Office Renovation", status: "onSite", hours: 8.5, location: { latitude: 52.5200, longitude: 13.4050 }, avatar: 'https://images.pexels.com/photos/585419/pexels-photo-585419.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', lastSeen: '10 minutes ago', address: 'Some street 1, Berlin' },
    { id: "2", name: "Maria Builder", project: "Apartment Painting", status: "offSite", hours: 7.0, location: { latitude: 52.5300, longitude: 13.4150 }, avatar: 'https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', lastSeen: '2 hours ago', address: 'Another street 2, Berlin' },
    { id: "3", name: "Lars Mason", project: "Retail Construction", status: "notCheckedIn", hours: 6.0, location: { latitude: 52.5100, longitude: 13.3850 }, avatar: 'https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', lastSeen: 'Yesterday', address: 'Third street 3, Berlin' },
    { id: "4", name: "Chen Wang", project: "Bridge Construction", status: "onSite", hours: 9.0, location: { latitude: 52.5150, longitude: 13.4250 }, avatar: 'https://images.pexels.com/photos/3771045/pexels-photo-3771045.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', lastSeen: '5 minutes ago', address: 'Fourth street 4, Berlin' },
    { id: "5", name: "Fatima Ahmed", project: "Road Paving", status: "onSite", hours: 8.0, location: { latitude: 52.5000, longitude: 13.4000 }, avatar: 'https://images.pexels.com/photos/3771069/pexels-photo-3771069.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', lastSeen: '30 minutes ago', address: 'Fifth street 5, Berlin' },
    { id: "6", name: "David Johansson", project: "Scaffolding Setup", status: "offSite", hours: 7.5, location: { latitude: 52.5400, longitude: 13.3950 }, avatar: 'https://images.pexels.com/photos/4513940/pexels-photo-4513940.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', lastSeen: '1 hour ago', address: 'Sixth street 6, Berlin' },
    { id: "7", name: "Yuki Tanaka", project: "Demolition", status: "notCheckedIn", hours: 0, location: { latitude: 52.5250, longitude: 13.3750 }, avatar: 'https://images.pexels.com/photos/5477855/pexels-photo-5477855.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', lastSeen: 'Today', address: 'Seventh street 7, Berlin' },
    { id: "8", name: "Carlos Gomez", project: "Foundation Work", status: "onSite", hours: 8.5, location: { latitude: 52.5050, longitude: 13.4150 }, avatar: 'https://images.pexels.com/photos/6455853/pexels-photo-6455853.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', lastSeen: '15 minutes ago', address: 'Eighth street 8, Berlin' },
  ]);

  const addWorker = (worker: Worker) => {
    setWorkers(prevWorkers => [...prevWorkers, { ...worker, id: String(prevWorkers.length + 1) }]);
  };

  return (
    <WorkersContext.Provider value={{ workers, addWorker }}>
      {children}
    </WorkersContext.Provider>
  );
}
