export interface Worker {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  role: 'worker' | 'manager';
  status: 'active' | 'invited' | 'pending';
  avatar?: string;
  pin?: string;
}

export interface Invite {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  role: 'worker' | 'manager';
  status: 'pending' | 'used';
  token: string;
  invitationMethod: 'email' | 'phone';
}