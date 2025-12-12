import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseAnonKey } from '../utils/supabase';
import { Invite } from '../types';

interface Company {
  name: string;
}

interface InvitesContextType {
  invites: Invite[];
  sendEmailInvite: (inviteData: { full_name: string; email: string; role: 'worker' | 'manager' }) => Promise<Invite | undefined>;
  getInviteByToken: (token: string) => Promise<Invite | undefined>;
  updateInviteStatus: (token: string, status: 'pending' | 'accepted' | 'expired') => Promise<void>;
  updateInvite: (updatedInvite: Invite) => Promise<Invite>; // NEW: Function to update an invite
  deleteInvite: (inviteId: string) => Promise<void>;
}

export const InvitesContext = createContext<InvitesContextType | null>(null);

export function InvitesProvider({ children }: { children: React.ReactNode }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null); // New state for company ID

  useEffect(() => {
    const getCompanyId = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      // If no session or no user, then no company_id can be determined yet.
      // This is expected on pages like signup or login.
      if (!session || !session.user || !session.user.id) {
        setUserCompanyId(null); // Explicitly set to null if no user
        // We don't have a 'loading' state in InvitesProvider, so no setLoading(false) here.
        return;
      }

      if (session?.user?.user_metadata?.company_id) {
        setUserCompanyId(session.user.user_metadata.company_id);
      } else {
        // If company_id is not in session, try fetching from employee table
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('company_id')
          .eq('id', session.user.id) // Use session.user.id directly
          .single();
        
        if (employeeData?.company_id) {
            setUserCompanyId(employeeData.company_id);
        } else if (employeeError) {
            console.error('Error fetching company_id from employee table:', employeeError);
        }
      }
    };

    getCompanyId();
  }, []); // Run once on mount to get company ID


  useEffect(() => {
    if (!userCompanyId) return; // Don't fetch invites until company ID is available

    const fetchInvites = async () => {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .eq('status', 'pending')
        .eq('company_id', userCompanyId); // Filter by company ID

      if (error) {
        console.error('Error fetching invites:', error);
      } else {
        setInvites(data as Invite[]);
      }
    };

    fetchInvites();

    // Setup real-time subscription for the specific company
    const inviteSubscription = supabase
      .channel(`invites_changes_company_${userCompanyId}`) // Unique channel per company
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invites', filter: `company_id=eq.${userCompanyId}` }, // Filter by company ID
        payload => {
          console.log('Invite Change received!', payload);
          setInvites(prevInvites => {
            const newInvite = payload.new as Invite;
            const oldInvite = payload.old as Invite;

            if (payload.eventType === 'INSERT') {
              if (newInvite.status === 'pending') {
                return [...prevInvites, newInvite];
              }
            } else if (payload.eventType === 'UPDATE') {
              if (newInvite.status !== 'pending') {
                return prevInvites.filter(inv => inv.id !== oldInvite.id);
              } else {
                return prevInvites.map(inv =>
                  inv.id === oldInvite.id ? newInvite : inv
                );
              }
            } else if (payload.eventType === 'DELETE') {
              return prevInvites.filter(inv => inv.id !== oldInvite.id);
            }
            return prevInvites;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(inviteSubscription);
    };
  }, [userCompanyId]); // Re-run effect when company ID changes

  const sendEmailInvite = useCallback(async (inviteData: { full_name: string; email: string; role: 'worker' | 'manager' }): Promise<Invite | undefined> => {
    // Get the current user's session to pass the access token and company_id to the Edge Function
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error('Error getting user session:', sessionError?.message);
      throw new Error('User not authenticated.');
    }

    if (!userCompanyId) {
      console.error('Company ID not available for sending invite.');
      throw new Error('Company ID not available.');
    }

    // Invoke the Edge Function, which now handles all database inserts and email sending
    const { data, error: functionError } = await supabase.functions.invoke('send-invite-email', {
      body: {
        full_name: inviteData.full_name,
        email: inviteData.email,
        role: inviteData.role,
        company_id: userCompanyId, // Pass the inviter's company ID
      }
    });

    if (functionError) {
      console.error('Error invoking send-invite-email function:', functionError);
      throw functionError;
    }

    // The Edge Function should return the created invite object
    // Assuming the Edge Function returns { invite: Invite }
    const newInvite = (data as any).invite as Invite; 

    if (newInvite) {
      setInvites(prevInvites => [...prevInvites, newInvite]);
      return newInvite;
    }
    return undefined;
  }, [userCompanyId]); // Re-run useCallback when userCompanyId changes

  const updateInvite = useCallback(async (updatedInvite: Invite): Promise<Invite> => { // NEW: updateInvite function
    if (!userCompanyId) throw new Error("Company ID not available.");

    const { data, error } = await supabase
      .from('invites')
      .update({ 
        full_name: updatedInvite.full_name,
        email: updatedInvite.email,
        role: updatedInvite.role,
      })
      .eq('id', updatedInvite.id)
      .eq('company_id', userCompanyId) // Ensure update is scoped to company
      .select()
      .single();

    if (error) {
      console.error('Error updating invite:', error);
      throw error;
    }

    setInvites(prevInvites => prevInvites.map(inv => inv.id === updatedInvite.id ? data : inv));
    return data;
  }, [userCompanyId]);

  const getInviteByToken = useCallback(async (token: string): Promise<Invite | undefined> => {
    console.log('getInviteByToken called with token:', token);

    // Use the standard supabase client. The RPC functions are security definers.
    const { data, error } = await supabase
      .rpc('get_invite_details', { invite_token: token })
      .single();

    if (error) {
      console.error('Error fetching invite by token:', error);
      return undefined;
    }

    console.log('Invite details from get_invite_details:', data);
    const inviteData = data as Invite;

    // Fetch company name separately if inviteData is valid.
    if (inviteData) {
        console.log('Fetching company name for invite_token:', token);
        const { data: company, error: companyError } = await supabase
            .rpc('get_company_name_for_invite', { invite_token: token })
            .single() as { data: Company | null, error: any };

        if (companyError) {
            console.error('Error fetching company name for invite:', companyError);
        }

        console.log('Company data from get_company_name_for_invite:', company);
        if (company) {
            inviteData.company_name = company.name; // Assign company name to the invite object
        }
    }
    
    console.log('Returning inviteData:', inviteData);
    return inviteData; // Return inviteData, now potentially with company_name
  }, []); // No userCompanyId dependency needed here

  const updateInviteStatus = useCallback(async (token: string, status: 'pending' | 'accepted' | 'expired') => {
    if (!userCompanyId) throw new Error("Company ID not available.");
    const { error } = await supabase
      .from('invites')
      .update({ status })
      .eq('token', token)
      .eq('company_id', userCompanyId); // Ensure update is scoped to company

    if (error) {
      console.error('Error updating invite status:', error);
    }
  }, [userCompanyId]);

  const deleteInvite = useCallback(async (inviteId: string) => {
    if (!userCompanyId) throw new Error("Company ID not available.");
    const { error } = await supabase
      .from('invites')
      .delete()
      .eq('id', inviteId)
      .eq('company_id', userCompanyId); // Ensure delete is scoped to company

    if (error) {
      console.error('Error deleting invite:', error);
      throw error;
    }

    setInvites(prevInvites => prevInvites.filter(invite => invite.id !== inviteId));
  }, [userCompanyId]);

  const value = useMemo(() => ({
    invites,
    sendEmailInvite,
    getInviteByToken,
    updateInviteStatus,
    updateInvite, // NEW: Add updateInvite to the context value
    deleteInvite,
  }), [invites, sendEmailInvite, getInviteByToken, updateInviteStatus, updateInvite, deleteInvite]);

  return (
    <InvitesContext.Provider value={value}>
      {children}
    </InvitesContext.Provider>
  );
}