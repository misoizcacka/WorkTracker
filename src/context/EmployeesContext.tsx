import React, { createContext, useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { Employee } from '../types';
import { useSession } from './AuthContext'; // Import useSession
import { getAvatarPublicUrl } from '../services/profile';

export interface EmployeesContextType {
  employees: Employee[];
  seatLimit: number;
  seatsUsed: number;
  scheduledSeatLimit: number | null;
  scheduledSeatEffectiveAt: string | null;
  updateEmployee: (employee: Employee) => Promise<void>;
  deleteEmployee: (employeeId: string) => Promise<void>;
  getEmployeeById: (employeeId: string) => Employee | undefined;
  loading: boolean;
  userCompanyId: string | null;
}

export const EmployeesContext = createContext<EmployeesContextType | null>(null);

export function EmployeesProvider({ children }: { children: React.ReactNode }) {
  const { userCompanyId, isCompanyIdLoading, userRole } = useSession(); 
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [seatLimit, setSeatLimit] = useState(0);
  const [scheduledSeatLimit, setScheduledSeatLimit] = useState<number | null>(null);
  const [scheduledSeatEffectiveAt, setScheduledSeatEffectiveAt] = useState<string | null>(null);

  useEffect(() => {
    if (isCompanyIdLoading) {
      setLoading(true);
      return;
    }
    if (!userCompanyId || !userRole) {
      setEmployees([]);
      setSeatLimit(0);
      setScheduledSeatLimit(null);
      setScheduledSeatEffectiveAt(null);
      setLoading(false);
      return;
    }

    // Workers shouldn't fetch all employees or company seats
    if (userRole === 'worker') {
      setEmployees([]);
      setSeatLimit(0);
      setScheduledSeatLimit(null);
      setScheduledSeatEffectiveAt(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Fetch Employees and Company seat limit in parallel
        const [empRes, compRes] = await Promise.all([
          supabase.from('employees')
            .select('*')
            .eq('company_id', userCompanyId)
            .order('created_at', { ascending: false }),
          supabase.from('companies')
            .select('worker_seats, scheduled_worker_seats, scheduled_change_effective_at')
            .eq('id', userCompanyId)
            .single()
        ]);

        if (empRes.error) console.error('Error fetching employees:', empRes.error);
        else {
          const enriched = (empRes.data || []).map(emp => ({
            ...emp,
            public_avatar_url: getAvatarPublicUrl(emp.avatar_url)
          }));
          setEmployees(enriched as Employee[]);
        }

        if (compRes.error) console.error('Error fetching company seats:', compRes.error);
        else {
          setSeatLimit(compRes.data?.worker_seats || 0);
          setScheduledSeatLimit(compRes.data?.scheduled_worker_seats ?? null);
          setScheduledSeatEffectiveAt(compRes.data?.scheduled_change_effective_at ?? null);
        }
      } catch (error) {
        console.error('Error in fetchData:', error);
      } finally {
        setLoading(false);
      }
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
              const enriched = { 
                ...payload.new, 
                public_avatar_url: getAvatarPublicUrl((payload.new as any).avatar_url) 
              };
              return [...prevEmployees, enriched as Employee];
            } else if (payload.eventType === 'UPDATE') {
              const enriched = { 
                ...payload.new, 
                public_avatar_url: getAvatarPublicUrl((payload.new as any).avatar_url) 
              };
              return prevEmployees.map(emp =>
                emp.id === payload.old.id ? (enriched as Employee) : emp
              );
            } else if (payload.eventType === 'DELETE') {
              return prevEmployees.filter(emp => emp.id !== payload.old.id);
            }
            return prevEmployees;
          });
        }
      )
      .subscribe();

    const companySubscription = supabase
      .channel(`company_subscription_${userCompanyId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'companies', filter: `id=eq.${userCompanyId}` },
        payload => {
          const nextCompany = payload.new as {
            worker_seats?: number;
            scheduled_worker_seats?: number | null;
            scheduled_change_effective_at?: string | null;
          };

          setSeatLimit(nextCompany.worker_seats || 0);
          setScheduledSeatLimit(nextCompany.scheduled_worker_seats ?? null);
          setScheduledSeatEffectiveAt(nextCompany.scheduled_change_effective_at ?? null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(employeeSubscription);
      supabase.removeChannel(companySubscription);
    };
  }, [userCompanyId, isCompanyIdLoading, userRole]); // Re-run effect when company ID, loading state, or role changes

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
      const enriched = {
        ...data,
        public_avatar_url: getAvatarPublicUrl(data.avatar_url)
      };
      setEmployees(prevEmployees =>
        prevEmployees.map(employee =>
          employee.id === data.id ? (enriched as Employee) : employee
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
    scheduledSeatLimit,
    scheduledSeatEffectiveAt,
    updateEmployee,
    deleteEmployee,
    getEmployeeById,
    loading,
    userCompanyId, // New: Add userCompanyId to the context value
  }), [employees, seatLimit, seatsUsed, scheduledSeatLimit, scheduledSeatEffectiveAt, updateEmployee, deleteEmployee, getEmployeeById, loading, userCompanyId]); // Add userCompanyId to dependencies

  return (
    <EmployeesContext.Provider value={value}>
      {children}
    </EmployeesContext.Provider>
  );
}
