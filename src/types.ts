export interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  role: 'worker' | 'manager' | 'owner';
  status: 'pending' | 'active' | 'disabled';
  avatar_url?: string;
  reporting_to?: string; // Re-added reporting_to
  created_at: string;
  company_id: string; // New: Add company_id
}

export interface Invite {
  id: string;
  full_name: string;
  email: string;
  role: 'worker' | 'manager';
  status: 'pending' | 'accepted' | 'expired';
  token: string;
  created_at: string;
  company_id: string; // New: Add company_id
}