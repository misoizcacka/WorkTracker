const DEFAULT_APP_URL = 'https://work-tracker-sandy-iota.vercel.app';
const INTERNAL_EMAIL_DOMAIN = '@koord.local';
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';

export function getAppBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_APP_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return DEFAULT_APP_URL;
}

export function buildInviteLink(token: string): string {
  return `${getAppBaseUrl()}/join/${token}`;
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

export function isManagedEmailAddress(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  return email.toLowerCase().endsWith(INTERNAL_EMAIL_DOMAIN);
}

export function formatEmailForDisplay(email: string | null | undefined): string {
  if (!email) {
    return 'No email';
  }

  return isManagedEmailAddress(email) ? 'Managed by company' : email;
}
