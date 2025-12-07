import React, { createContext, useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { Employee } from '../types';

export interface EmployeesContextType {
  employees: Employee[];
  seatLimit: number;
  seatsUsed: number;
  updateEmployee: (employee: Employee) => Promise<void>;
  deleteEmployee: (employeeId: string) => Promise<void>;
  getEmployeeById: (employeeId: string) => Employee | undefined;
  userCompanyId: string | null; // New: Add userCompanyId
}

export const EmployeesContext = createContext<EmployeesContextType | null>(null);

export function EmployeesProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null); // New state for company ID
  const seatLimit = 10; // This could be dynamic based on subscription

  useEffect(() => {
    const getCompanyId = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      // If no session or no user, then no company_id can be determined yet.
      // This is expected on pages like signup or login.
      if (!session || !session.user || !session.user.id) {
        setUserCompanyId(null); // Explicitly set to null if no user
        setLoading(false); // Stop loading if no user is found
        return;
      }

      if (session.user.user_metadata?.company_id) {
        setUserCompanyId(session.user.user_metadata.company_id);
      } else {
        // If company_id is not in session, try fetching from employee table
        // This might happen if user metadata is not immediately updated or on first login
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('company_id')
          .eq('id', session.user.id) // Use session.user.id directly
          .single();
        
        if (employeeData?.company_id) {
            setUserCompanyId(employeeData.company_id);
            // Optionally update user_metadata in auth.users if it's missing
            // This would require supabase.auth.admin.updateUserById, which is admin privileged
            // For now, just setting client-side state is sufficient
        } else if (employeeError) {
            console.error('Error fetching company_id from employee table:', employeeError);
        }
      }
      setLoading(false); // Move setLoading(false) here to cover all branches
    };

    getCompanyId();
  }, []); // Run once on mount to get company ID

  useEffect(() => {
    if (!userCompanyId) return; // Don't fetch employees until company ID is available

    const fetchEmployees = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('employees')
        .select('*')
        .eq('company_id', userCompanyId) // Filter by company ID
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employees:', error);
      } else {
        setEmployees(data as Employee[]);
      }
      setLoading(false);
    };

    fetchEmployees();

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
  }, [userCompanyId]); // Re-run effect when company ID changes

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