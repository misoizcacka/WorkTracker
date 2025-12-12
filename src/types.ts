export interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  role: 'worker' | 'manager' | 'owner';
  status: 'pending' | 'active' | 'disabled';
  avatar_url: string | null;
  reporting_to: string | null; // Changed to string | null
  created_at: string;
  company_id: string; // New: Add company_id
}

export interface Invite {
  id: string;
  full_name: string;
  email: string;
  role: 'worker' | 'manager';
  status: 'pending' | 'accepted' | 'expired';
  token: string; // Re-added token
  created_at: string;
  company_id: string; // New: Add company_id
  company_name: string; // NEW: Add company_name
}