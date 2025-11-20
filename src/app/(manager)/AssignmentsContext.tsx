import React, { useState, useContext } from 'react';

interface Assignment {
  id: string;
  workerId: string;
  projectId: string;
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "17:00"
  date: string;      // e.g., "2025-11-16"
  notes?: string;
}

const DUMMY_ASSIGNMENTS: Assignment[] = [
  { id: 'a1', workerId: 'w1', projectId: 'p1', date: '2025-11-16', startTime: '09:00', endTime: '13:00', notes: 'Focus on 3rd floor.' },
  { id: 'a2', workerId: 'w2', projectId: 'p2', date: '2025-11-16', startTime: '10:00', endTime: '16:00' },
  { id: 'a3', workerId: 'w1', projectId: 'p2', date: '2025-11-17', startTime: '14:00', endTime: '18:00' },
];

export const AssignmentsContext = React.createContext<{
  assignments: Assignment[];
  addAssignment: (assignment: Omit<Assignment, 'id'>) => void;
  updateAssignment: (assignment: Assignment) => void;
  removeAssignment: (id: string) => void;
} | null>(null);

export function AssignmentsProvider({ children }: { children: React.ReactNode }) {
  const [assignments, setAssignments] = useState<Assignment[]>(DUMMY_ASSIGNMENTS);

  const addAssignment = (newAssignment: Omit<Assignment, 'id'>) => {
    setAssignments(prev => [...prev, { ...newAssignment, id: `a${prev.length + 1}` }]);
  };

  const updateAssignment = (updatedAssignment: Assignment) => {
    setAssignments(prev => prev.map(assign =>
      assign.id === updatedAssignment.id ? updatedAssignment : assign
    ));
  };

  const removeAssignment = (id: string) => {
    setAssignments(prev => prev.filter(assign => assign.id !== id));
  };

  return (
    <AssignmentsContext.Provider value={{ assignments, addAssignment, updateAssignment, removeAssignment }}>
      {children}
    </AssignmentsContext.Provider>
  );
}

export const useAssignments = () => {
  const context = useContext(AssignmentsContext);
  if (!context) {
    throw new Error('useAssignments must be used within an AssignmentsProvider');
  }
  return context;
};
