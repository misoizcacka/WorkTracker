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
  pendingWorkerInvites: number;
  updateEmployee: (employee: Employee) => Promise<void>;
  deleteEmployee: (employeeId: string) => Promise<void>;
  enableEmployee: (employeeId: string) => Promise<void>;
  getEmployeeById: (employeeId: string) => Employee | undefined;
  refreshPendingInvites: () => Promise<void>;
  loading: boolean;
  userCompanyId: string | null;
}

export const EmployeesContext = createContext<EmployeesContextType | null>(null);

export function EmployeesProvider({ children }: { children: React.ReactNode }) {
  const { user, userCompanyId, isCompanyIdLoading, userRole } = useSession(); 
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [seatLimit, setSeatLimit] = useState(0);
  const [scheduledSeatLimit, setScheduledSeatLimit] = useState<number | null>(null);
  const [scheduledSeatEffectiveAt, setScheduledSeatEffectiveAt] = useState<string | null>(null);
  const [pendingWorkerInvites, setPendingWorkerInvites] = useState(0);

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
      setPendingWorkerInvites(0);
      setLoading(false);
      return;
    }

    // Workers shouldn't fetch all employees or company seats
    if (userRole === 'worker') {
      setEmployees([]);
      setSeatLimit(0);
      setScheduledSeatLimit(null);
      setScheduledSeatEffectiveAt(null);
      setPendingWorkerInvites(0);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      
      try {
        let employeesQuery = supabase.from('employees')
            .select('*')
            .eq('company_id', userCompanyId)
            .order('created_at', { ascending: false });

        if (userRole === 'manager' && user?.id) {
          employeesQuery = employeesQuery.or(`id.eq.${user.id},reporting_to.eq.${user.id}`);
        }

        const companySeatsQuery = userRole === 'owner'
          ? supabase.from('companies')
              .select('worker_seats, scheduled_worker_seats, scheduled_change_effective_at')
              .eq('id', userCompanyId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null });

        // Count pending worker invites (new invites only, not regenerated access links)
        const pendingInvitesQuery = supabase
          .from('invites')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', userCompanyId)
          .eq('role', 'worker')
          .eq('status', 'pending')
          .eq('used', false)
          .is('employee_id', null);

        const [empRes, compRes, inviteRes] = await Promise.all([
          employeesQuery,
          companySeatsQuery,
          pendingInvitesQuery,
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
        else if (compRes.data) {
          setSeatLimit(compRes.data?.worker_seats || 0);
          setScheduledSeatLimit(compRes.data?.scheduled_worker_seats ?? null);
          setScheduledSeatEffectiveAt(compRes.data?.scheduled_change_effective_at ?? null);
        } else {
          setSeatLimit(0);
          setScheduledSeatLimit(null);
          setScheduledSeatEffectiveAt(null);
        }

        if (inviteRes.error) console.error('Error counting pending invites:', inviteRes.error);
        else {
          setPendingWorkerInvites(inviteRes.count ?? 0);
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
              const employee = enriched as Employee;
              if (userRole === 'manager' && employee.id !== user?.id && employee.reporting_to !== user?.id) {
                return prevEmployees;
              }
              return [...prevEmployees, employee];
            } else if (payload.eventType === 'UPDATE') {
              const enriched = { 
                ...payload.new, 
                public_avatar_url: getAvatarPublicUrl((payload.new as any).avatar_url) 
              };
              const employee = enriched as Employee;
              if (userRole === 'manager' && employee.id !== user?.id && employee.reporting_to !== user?.id) {
                return prevEmployees.filter(emp => emp.id !== payload.old.id);
              }
              return prevEmployees.some(emp => emp.id === payload.old.id)
                ? prevEmployees.map(emp => emp.id === payload.old.id ? employee : emp)
                : [...prevEmployees, employee];
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

    // Subscribe to invites changes to update pending worker invites count
    const invitesSubscription = supabase
      .channel(`invites_subscription_${userCompanyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invites', filter: `company_id=eq.${userCompanyId}` },
        async (payload) => {
          console.log('🔔 Invites table changed - event:', payload.eventType, 'refreshing pending count');
          // Refresh pending invites count
          const { count, error } = await supabase
            .from('invites')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', userCompanyId)
            .eq('role', 'worker')
            .eq('status', 'pending')
            .eq('used', false)
            .is('employee_id', null);
          
          if (!error) {
            console.log('✅ Updated pending invites count:', count);
            setPendingWorkerInvites(count ?? 0);
          } else {
            console.error('❌ Error fetching pending invites count:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(employeeSubscription);
      supabase.removeChannel(companySubscription);
      supabase.removeChannel(invitesSubscription);
    };
  }, [user?.id, userCompanyId, isCompanyIdLoading, userRole]); // Re-run effect when company ID, loading state, role, or user changes

  const seatsUsed = useMemo(() => {
    const activeWorkers = employees.filter(e => e.role === 'worker' && e.status === 'active').length;
    return activeWorkers + pendingWorkerInvites;
  }, [employees, pendingWorkerInvites]);

  const getEmployeeById = useCallback((employeeId: string) => {
    // Ensure that the employee belongs to the current company
    return employees.find(employee => employee.id === employeeId && employee.company_id === userCompanyId);
  }, [employees, userCompanyId]);

  const updateEmployee = useCallback(async (updatedEmployee: Employee) => {
    if (!userCompanyId) throw new Error("Company ID not available.");
    const existingEmployee = employees.find((employee) => employee.id === updatedEmployee.id);
    if (userRole === 'manager' && (!existingEmployee || (existingEmployee.id !== user?.id && existingEmployee.reporting_to !== user?.id))) {
      throw new Error("You do not have permission to update this employee.");
    }
    const normalizedEmail = updatedEmployee.email.trim().toLowerCase();
    let data: Employee | null = null;
    let error: any = null;

    if (existingEmployee && existingEmployee.email.trim().toLowerCase() !== normalizedEmail) {
      const { data: emailUpdatedEmployee, error: emailUpdateError } = await supabase.rpc('update_employee_email', {
        p_employee_id: updatedEmployee.id,
        p_email: normalizedEmail,
      });

      if (emailUpdateError) {
        console.error('Error updating employee email via RPC:', emailUpdateError);
        throw emailUpdateError;
      }

      data = emailUpdatedEmployee as Employee | null;
    }

    const {
      public_avatar_url,
      email: _ignoredEmail,
      ...employeePayload
    } = updatedEmployee as Employee & { public_avatar_url?: string | null };

    const { data: updatedRow, error: updateError } = await supabase
      .from('employees')
      .update(employeePayload)
      .eq('id', updatedEmployee.id)
      .eq('company_id', userCompanyId) // Ensure update is scoped to company
      .select()
      .single();

    data = updatedRow;
    error = updateError;

    if (error) {
      console.error('Error updating employee:', error);
      throw error;
    }

    if (data) {
      const enriched = {
        ...data,
        public_avatar_url: data.avatar_url ? getAvatarPublicUrl(data.avatar_url) : null
      };
      setEmployees(prevEmployees =>
        prevEmployees.map(employee =>
          employee.id === data.id ? (enriched as Employee) : employee
        )
      );
    }
  }, [user?.id, userCompanyId, userRole, employees]);

  const deleteEmployee = useCallback(async (employeeId: string) => {
    if (!userCompanyId) throw new Error("Company ID not available.");
    const existingEmployee = employees.find((employee) => employee.id === employeeId);
    if (userRole === 'manager' && (!existingEmployee || existingEmployee.reporting_to !== user?.id || existingEmployee.role !== 'worker')) {
      throw new Error("You do not have permission to remove this employee.");
    }
    
    // Soft delete: set status to 'disabled' instead of hard deleting
    const { error } = await supabase
      .from('employees')
      .update({ status: 'disabled' })
      .eq('id', employeeId)
      .eq('company_id', userCompanyId);

    if (error) {
      console.error('Error disabling employee:', error);
      throw error;
    }

    // Update local state
    setEmployees(prevEmployees =>
      prevEmployees.map(employee =>
        employee.id === employeeId ? { ...employee, status: 'disabled' as const } : employee
      )
    );
  }, [user?.id, userCompanyId, userRole, employees]);

  const enableEmployee = useCallback(async (employeeId: string) => {
    if (!userCompanyId) throw new Error("Company ID not available.");
    const existingEmployee = employees.find((employee) => employee.id === employeeId);
    
    if (userRole === 'manager' && (!existingEmployee || existingEmployee.reporting_to !== user?.id || existingEmployee.role !== 'worker')) {
      throw new Error("You do not have permission to enable this employee.");
    }
    
    // Check seat limit for workers
    if (existingEmployee?.role === 'worker') {
      const activeWorkers = employees.filter(e => e.role === 'worker' && e.status === 'active').length;
      if (activeWorkers >= seatLimit) {
        throw new Error("Cannot enable worker: seat limit reached.");
      }
    }
    
    // Re-enable: set status to 'active'
    const { error } = await supabase
      .from('employees')
      .update({ status: 'active' })
      .eq('id', employeeId)
      .eq('company_id', userCompanyId);

    if (error) {
      console.error('Error enabling employee:', error);
      throw error;
    }

    // Update local state
    setEmployees(prevEmployees =>
      prevEmployees.map(employee =>
        employee.id === employeeId ? { ...employee, status: 'active' as const } : employee
      )
    );
  }, [user?.id, userCompanyId, userRole, employees, seatLimit]);

  const refreshPendingInvites = useCallback(async () => {
    if (!userCompanyId) return;
    
    console.log('🔄 Manually refreshing pending invites count...');
    const { count, error } = await supabase
      .from('invites')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', userCompanyId)
      .eq('role', 'worker')
      .eq('status', 'pending')
      .eq('used', false)
      .is('employee_id', null);
    
    if (!error) {
      console.log('✅ Refreshed pending invites count:', count);
      setPendingWorkerInvites(count ?? 0);
    } else {
      console.error('❌ Error refreshing pending invites count:', error);
    }
  }, [userCompanyId]);

  const value = useMemo(() => ({
    employees,
    seatLimit,
    seatsUsed,
    scheduledSeatLimit,
    scheduledSeatEffectiveAt,
    pendingWorkerInvites,
    updateEmployee,
    deleteEmployee,
    enableEmployee,
    getEmployeeById,
    refreshPendingInvites,
    loading,
    userCompanyId, // New: Add userCompanyId to the context value
  }), [employees, seatLimit, seatsUsed, scheduledSeatLimit, scheduledSeatEffectiveAt, pendingWorkerInvites, updateEmployee, deleteEmployee, enableEmployee, getEmployeeById, refreshPendingInvites, loading, userCompanyId]); // Add userCompanyId to dependencies

  return (
    <EmployeesContext.Provider value={value}>
      {children}
    </EmployeesContext.Provider>
  );
}
