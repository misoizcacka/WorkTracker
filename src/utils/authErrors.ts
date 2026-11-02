/**
 * Type-safe auth error handling utilities
 * Uses HTTP status codes instead of fragile string matching
 */

import { AuthError } from '@supabase/supabase-js';

export interface AuthErrorInfo {
  status?: number;
  code?: string;
  message: string;
}

/**
 * Safely extract error info from Supabase AuthError
 */
export function getAuthErrorInfo(error: AuthError): AuthErrorInfo {
  return {
    status: (error as any).status,
    code: (error as any).code,
    message: error.message,
  };
}

/**
 * Check if error is a rate limit error
 * Error code: over_request_rate_limit, over_email_send_rate_limit
 * Status: 429
 */
export function isRateLimitError(error: AuthError): boolean {
  const info = getAuthErrorInfo(error);
  return info.status === 429 || 
         info.code === 'over_request_rate_limit' ||
         info.code === 'over_email_send_rate_limit';
}

/**
 * Check if user already exists (for signup)
 * Error code: user_already_exists
 * Status: 422
 */
export function isUserAlreadyExistsError(error: AuthError): boolean {
  const info = getAuthErrorInfo(error);
  return info.status === 422 || info.code === 'user_already_exists';
}

/**
 * Check if email is not confirmed
 * Error code: email_not_confirmed
 * Status: 400
 */
export function isEmailNotConfirmedError(error: AuthError): boolean {
  const info = getAuthErrorInfo(error);
  return info.code === 'email_not_confirmed';
}

/**
 * Check if credentials are invalid (wrong email/password)
 * Error code: invalid_credentials
 * Status: 400
 */
export function isInvalidCredentialsError(error: AuthError): boolean {
  const info = getAuthErrorInfo(error);
  return info.code === 'invalid_credentials';
}

/**
 * Check if password is weak
 * Error code: weak_password
 * Status: 422
 */
export function isWeakPasswordError(error: AuthError): boolean {
  const info = getAuthErrorInfo(error);
  return info.code === 'weak_password';
}

/**
 * Check if email address is invalid
 * Error code: email_address_invalid
 * Status: 422
 */
export function isInvalidEmailError(error: AuthError): boolean {
  const info = getAuthErrorInfo(error);
  return info.code === 'email_address_invalid';
}
