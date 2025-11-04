import React, { useState } from 'react';

export const WorkersContext = React.createContext<{
  workers: any[];
  addWorker: (worker: any) => void;
} | null>(null);

export function WorkersProvider({ children }: { children: React.ReactNode }) {
  const [workers, setWorkers] = useState([
    { id: "1", name: "John Worker", project: "Office Renovation", status: "onSite", hours: 8.5 },
    { id: "2", name: "Maria Builder", project: "Apartment Painting", status: "offSite", hours: 7.0 },
    { id: "3", name: "Lars Mason", project: "Retail Construction", status: "notCheckedIn", hours: 6.0 },
  ]);

  const addWorker = (worker: any) => {
    setWorkers(prevWorkers => [...prevWorkers, { ...worker, id: String(prevWorkers.length + 1) }]);
  };

  return (
    <WorkersContext.Provider value={{ workers, addWorker }}>
      {children}
    </WorkersContext.Provider>
  );
}
