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
    { id: "1", name: "Nikola Jagodina", project: "Office Renovation", status: "onSite", hours: 8.5, location: { latitude: 52.5200, longitude: 13.4050 }, avatar: 'https://i.imgur.com/DkSvfK0.png', lastSeen: '10 minutes ago', address: 'Some street 1, Berlin' },
    { id: "2", name: "Zoki Srce", project: "Apartment Painting", status: "offSite", hours: 7.0, location: { latitude: 52.5300, longitude: 13.4150 }, avatar: 'https://i.imgur.com/GckJB1a.png', lastSeen: '2 hours ago', address: 'Another street 2, Berlin' },
    { id: "3", name: "Tote Arapin", project: "Retail Construction", status: "notCheckedIn", hours: 6.0, location: { latitude: 52.5100, longitude: 13.3850 }, avatar: 'https://i.imgur.com/qirZ3E6.png', lastSeen: 'Yesterday', address: 'Third street 3, Berlin' },
    { id: "4", name: "Arapin Glupi", project: "Bridge Construction", status: "onSite", hours: 9.0, location: { latitude: 52.5150, longitude: 13.4250 }, avatar: 'https://i.imgur.com/keD0fuz.png', lastSeen: '5 minutes ago', address: 'Fourth street 4, Berlin' },
    { id: "5", name: "Boris Marama", project: "Road Paving", status: "onSite", hours: 8.0, location: { latitude: 52.5000, longitude: 13.4000 }, avatar: 'https://i.imgur.com/ywYuPSt.png', lastSeen: '30 minutes ago', address: 'Fifth street 5, Berlin' },
    { id: "6", name: "Stefan Colovic", project: "Scaffolding Setup", status: "offSite", hours: 7.5, location: { latitude: 52.5400, longitude: 13.3950 }, avatar: 'https://i.imgur.com/cgtGgBw.png', lastSeen: '1 hour ago', address: 'Sixth street 6, Berlin' },
    { id: "7", name: "Nikola Nikolic", project: "Demolition", status: "notCheckedIn", hours: 0, location: { latitude: 52.5250, longitude: 13.3750 }, avatar: 'https://i.imgur.com/hj422E8.png', lastSeen: 'Today', address: 'Seventh street 7, Berlin' },
    { id: "8", name: "Marko Markovic", project: "Foundation Work", status: "onSite", hours: 8.5, location: { latitude: 52.5050, longitude: 13.4150 }, avatar: 'https://i.imgur.com/1nSAQlW.png', lastSeen: '15 minutes ago', address: 'Eighth street 8, Berlin' },
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