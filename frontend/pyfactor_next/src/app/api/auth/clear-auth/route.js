import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * API route to clear auth state
 * 
 * This route:
 * 1. Provides an endpoint for server-initiated auth clearing
 * 2. Simply passes success response - actual signOut happens on client
 * 3. Does not manage cookies (unlike the deprecated clear-cookies route)
 * 
 * Client usage:
 * - Import { signOut } from 'aws-amplify/auth'
 * - Use await signOut() to properly clear Cognito authentication
 */
export async function POST() {
  logger.debug('[API] Processing auth clear request');

  // Simply return success - client is responsible for Cognito signOut()
  const response = NextResponse.json({ 
    success: true,
    message: 'Auth clear request received. Client must call Cognito signOut().'
  });

  return response;
} 