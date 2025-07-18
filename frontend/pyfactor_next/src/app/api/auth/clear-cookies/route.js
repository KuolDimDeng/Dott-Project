import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * API route to clear auth cookies - DEPRECATED
 * 
 * ⚠️ DEPRECATED: This route is maintained only for backward compatibility.
 * ⚠️ DO NOT USE IN NEW CODE.
 * 
 * New implementations MUST use Cognito signOut instead of cookie-based auth clearing.
 * The entire auth system has transitioned to use Cognito attributes exclusively.
 * 
 * Alternative approach:
 * - Import { signOut } from 'aws-amplify/auth'
 * - Use await signOut() to properly clear Cognito authentication
 */
function clearAllCookies() {
  const isDev = process.env.NODE_ENV === 'development';
  const expiredOptions = {
    path: '/',
    httpOnly: true,
    secure: !isDev,
    sameSite: 'lax',
    maxAge: 0
  };

  const response = NextResponse.json({ 
    success: true,
    message: 'All auth cookies cleared'
  });

  // Clear all auth-related cookies including current session cookies
  response.cookies.set('sid', '', expiredOptions);
  response.cookies.set('session_token', '', expiredOptions);
  response.cookies.set('idToken', '', expiredOptions);
  response.cookies.set('accessToken', '', expiredOptions);
  response.cookies.set('refreshToken', '', expiredOptions);
  response.cookies.set('authToken', '', expiredOptions);
  response.cookies.set('onboardingStep', '', expiredOptions);
  response.cookies.set('onboardedStatus', '', expiredOptions);
  response.cookies.set('setupCompleted', '', expiredOptions);
  response.cookies.set('tenantId', '', expiredOptions);
  response.cookies.set('businessid', '', expiredOptions);

  logger.debug('[API] All auth cookies cleared');
  return response;
}

export async function POST() {
  logger.warn('[API] DEPRECATED: Using clear-cookies route POST method');
  return clearAllCookies();
}

export async function GET() {
  logger.info('[API] Clearing all cookies via GET request');
  return clearAllCookies();
}