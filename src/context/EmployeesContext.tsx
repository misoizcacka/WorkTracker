import React, { createContext, useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { Employee } from '../types';
import { useSession } from './AuthContext'; // Import useSession

export interface EmployeesContextType {
  employees: Employee[];
  seatLimit: number;
  seatsUsed: number;
  updateEmployee: (employee: Employee) => Promise<void>;
  deleteEmployee: (employeeId: string) => Promise<void>;
  getEmployeeById: (employeeId: string) => Employee | undefined;
}

export const EmployeesContext = createContext<EmployeesContextType | null>(null);

export function EmployeesProvider({ children }: { children: React.ReactNode }) {
  const { userCompanyId, isCompanyIdLoading } = useSession(); 
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [seatLimit, setSeatLimit] = useState(0);

  useEffect(() => {
    if (isCompanyIdLoading) {
      setLoading(true);
      return;
    }
    if (!userCompanyId) {
      setEmployees([]);
      setSeatLimit(0);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      
      // Fetch Employees and Company seat limit in parallel
      const [empRes, compRes] = await Promise.all([
        supabase.from('employees')
          .select('*')
          .eq('company_id', userCompanyId)
          .order('created_at', { ascending: false }),
        supabase.from('companies')
          .select('worker_seats')
          .eq('id', userCompanyId)
          .single()
      ]);

      if (empRes.error) console.error('Error fetching employees:', empRes.error);
      else setEmployees(empRes.data as Employee[]);

      if (compRes.error) console.error('Error fetching company seats:', compRes.error);
      else setSeatLimit(compRes.data?.worker_seats || 0);

      setLoading(false);
    };

    fetchData();

    // Setup real-time subscription for the specific company
    const employeeSubscription = supabase
      .channel(`employees_changes_company_${userCompanyId}`) // Unique channel per company
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employees', filter: `company_id=eq.${userCompanyId}` }, // Filter by company ID
        payload => {
          console.log('Employee Change received!', payload);
          setEmployees(prevEmployees => {
            if (payload.eventType === 'INSERT') {
              return [...prevEmployees, payload.new as Employee];
            } else if (payload.eventType === 'UPDATE') {
              return prevEmployees.map(emp =>
                emp.id === payload.old.id ? (payload.new as Employee) : emp
              );
            } else if (payload.eventType === 'DELETE') {
              return prevEmployees.filter(emp => emp.id !== payload.old.id);
            }
            return prevEmployees;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(employeeSubscription);
    };
  }, [userCompanyId, isCompanyIdLoading]); // Re-run effect when company ID or its loading state changes

  const seatsUsed = useMemo(() => employees.filter(e => e.role === 'worker').length, [employees]);

  const getEmployeeById = useCallback((employeeId: string) => {
    // Ensure that the employee belongs to the current company
    return employees.find(employee => employee.id === employeeId && employee.company_id === userCompanyId);
  }, [employees, userCompanyId]);

  const updateEmployee = useCallback(async (updatedEmployee: Employee) => {
    if (!userCompanyId) throw new Error("Company ID not available.");
    const { data, error } = await supabase
      .from('employees')
      .update(updatedEmployee)
      .eq('id', updatedEmployee.id)
      .eq('company_id', userCompanyId) // Ensure update is scoped to company
      .select()
      .single();

    if (error) {
      console.error('Error updating employee:', error);
      throw error;
    }

    if (data) {
      setEmployees(prevEmployees =>
        prevEmployees.map(employee =>
          employee.id === data.id ? (data as Employee) : employee
        )
      );
    }
  }, [userCompanyId]);

  const deleteEmployee = useCallback(async (employeeId: string) => {
    if (!userCompanyId) throw new Error("Company ID not available.");
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', employeeId)
      .eq('company_id', userCompanyId); // Ensure delete is scoped to company

    if (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }

    setEmployees(prevEmployees =>
      prevEmployees.filter(employee => employee.id !== employeeId)
    );
  }, [userCompanyId]);

  const value = useMemo(() => ({
    employees,
    seatLimit,
    seatsUsed,
    updateEmployee,
    deleteEmployee,
    getEmployeeById,
    loading,
    userCompanyId, // New: Add userCompanyId to the context value
  }), [employees, seatLimit, seatsUsed, updateEmployee, deleteEmployee, getEmployeeById, loading, userCompanyId]); // Add userCompanyId to dependencies

  return (
    <EmployeesContext.Provider value={value}>
      {children}
    </EmployeesContext.Provider>
  );
}