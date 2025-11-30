import React, { createContext, useState, useCallback, useContext, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Invite } from '../../types';
import { WorkersContext } from './WorkersContext';

type InviteData = Omit<Invite, 'id' | 'status' | 'token'>;

interface InvitesContextType {
  invites: Invite[];
  addInvite: (inviteData: InviteData) => Promise<Invite>;
  getInviteByToken: (token: string) => Invite | undefined;
  updateInviteStatus: (token: string, status: 'pending' | 'used') => void;
}

export const InvitesContext = createContext<InvitesContextType | null>(null);

export function InvitesProvider({ children }: { children: React.ReactNode }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const workersContext = useContext(WorkersContext);

  const addInvite = useCallback((inviteData: InviteData): Promise<Invite> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const token = uuidv4();
            const newInvite: Invite = {
                ...inviteData,
                id: (invites.length + 1).toString(),
                status: 'pending',
                token,
            };
            setInvites(prevInvites => [...prevInvites, newInvite]);
            console.log(`Simulating sending ${inviteData.invitationMethod} invite to: ${inviteData.invitationMethod === 'email' ? inviteData.email : inviteData.phone}`);
            console.log(`Invite Link: /signup?invite=${token}`);
            resolve(newInvite);
        }, 1000);
    });
  }, [invites.length, workersContext]);

  const getInviteByToken = useCallback((token: string) => {
    return invites.find(invite => invite.token === token && invite.status === 'pending');
  }, [invites]);

  const updateInviteStatus = useCallback((token: string, status: 'pending' | 'used') => {
    setInvites(prevInvites =>
      prevInvites.map(invite =>
        invite.token === token ? { ...invite, status } : invite
      )
    );
  }, []);

  const value = useMemo(() => ({
    invites,
    addInvite,
    getInviteByToken,
    updateInviteStatus,
  }), [invites, addInvite, getInviteByToken, updateInviteStatus]);

  return (
    <InvitesContext.Provider value={value}>
      {children}
    </InvitesContext.Provider>
  );
}