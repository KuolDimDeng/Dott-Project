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
export async function POST() {
  logger.warn('[API] DEPRECATED: Using clear-cookies route. This API will be removed in future. Use Cognito signOut() instead.');

  const isDev = process.env.NODE_ENV === 'development';
  const expiredOptions = {
    path: '/',
    httpOnly: true,
    secure: !isDev,
    sameSite: isDev ? 'lax' : 'strict',
    maxAge: 0
  };

  const response = NextResponse.json({ 
    success: true,
    message: '⚠️ DEPRECATED: Auth cookies cleared for backward compatibility only. Use signOut() from aws-amplify/auth instead.'
  });

  // Clear all auth-related cookies
  response.cookies.set('idToken', '', expiredOptions);
  response.cookies.set('accessToken', '', expiredOptions);
  response.cookies.set('refreshToken', '', expiredOptions);
  response.cookies.set('authToken', '', expiredOptions);
  response.cookies.set('onboardingStep', '', expiredOptions);
  response.cookies.set('onboardedStatus', '', expiredOptions);
  response.cookies.set('setupCompleted', '', expiredOptions);
  response.cookies.set('tenantId', '', expiredOptions);
  response.cookies.set('businessid', '', expiredOptions);

  logger.debug('[API] Auth cookies cleared for backward compatibility only');
  return response;
}