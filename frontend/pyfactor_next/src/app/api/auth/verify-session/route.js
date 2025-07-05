import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverAuth';
import { isValidUUID } from '@/utils/tenantUtils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Endpoint to verify user session and return Cognito attribute data
 * This is a preferred replacement for cookie-based session validation
 */
export async function GET(request) {
  try {
    // Validate the session using our server-side utility
    const { user, error } = await validateServerSession(request);
    
    if (error) {
      logger.error('[VerifySession] Session validation failed:', error);
      return new Response(error.message || 'Session validation failed', { 
        status: error.status || 401 
      });
    }

    if (!user) {
      logger.error('[VerifySession] No user found in session');
      return new Response('No user found in session', { status: 401 });
    }

    // Return the user's Cognito attributes
    return NextResponse.json({
      user: {
        username: user.username,
        userId: user.userId,
        email: user.email,
        attributes: user.attributes
      }
    });
  } catch (error) {
    logger.error('[VerifySession] Unexpected error:', error);
    return new Response('Internal server error', { status: 500 });
  }
} 