import { supabase } from './supabase';

export type ConsentType = 'terms' | 'privacy' | 'dpa' | 'location_tracking';

interface LogConsentParams {
  userId: string;
  consentType: ConsentType;
  documentVersion?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log user consent for GDPR compliance
 * Records when and what the user consented to
 */
export async function logConsent({
  userId,
  consentType,
  documentVersion = 'v1.0-2026-10-20',
  ipAddress,
  userAgent,
}: LogConsentParams): Promise<void> {
  try {
    const { error } = await supabase.from('consent_logs').insert({
      user_id: userId,
      consent_type: consentType,
      document_version: documentVersion,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) {
      console.error('Failed to log consent:', error);
      // Don't throw - consent logging failure shouldn't block user flow
    }
  } catch (err) {
    console.error('Error logging consent:', err);
  }
}

/**
 * Get all consent logs for a user
 */
export async function getUserConsents(userId: string) {
  const { data, error } = await supabase
    .from('consent_logs')
    .select('*')
    .eq('user_id', userId)
    .order('accepted_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch user consents:', error);
    return [];
  }

  return data || [];
}
