import type { AuthError } from '@supabase/supabase-js'

export function authErrorMessage(error: AuthError): string {
  switch (error.code) {
    case 'email_not_confirmed':
      return 'Your email address has not been confirmed yet. Check your inbox (and spam folder) for the confirmation link, or request a new one by signing up again.'
    case 'invalid_credentials':
    case 'invalid_grant':
      return 'Incorrect email or password. Please try again.'
    case 'user_already_exists':
    case 'user_already_registered':
      return 'An account with this email already exists. Try signing in instead.'
    case 'signup_disabled':
      return 'Public sign-ups are disabled on this instance. Contact the instance owner, or sign in if you already have an account.'
    case 'rate_limit_exceeded':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'weak_password':
      return error.message || 'Your password is too weak. Use at least 8 characters with a mix of letters, numbers and symbols.'
    case 'email_exists':
      return 'An account with this email already exists. Try signing in instead.'
    case 'otp_expired':
      return 'This link has expired. Please request a new one.'
    default:
      return error.message || 'Something went wrong. Please try again.'
  }
}
