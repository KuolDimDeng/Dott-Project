import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { authOptions } from '../[...nextauth]/route';
import { getServerSession } from 'next-auth/next';
import { getCurrentUser } from '@/utils/cognito'; // Import the Cognito utility

/**
 * Custom session endpoint to ensure properly formatted JSON responses
 * This endpoint is called by the Next Auth client library
 * Falls back to Cognito when NextAuth fails
 */
export async function GET(request) {
  try {
    logger.debug('[Session Route] Getting server session');
    
    // First try to get the session from NextAuth
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (nextAuthError) {
      logger.warn('[Session Route] NextAuth error:', nextAuthError.message);
      // We'll handle this below by trying Cognito directly
    }
    
    // If no NextAuth session, try to get user info directly from Cognito
    if (!session) {
      logger.debug('[Session Route] No NextAuth session, trying Cognito directly');
      
      try {
        const cognitoUser = await getCurrentUser();
        
        if (cognitoUser) {
          logger.info('[Session Route] Found Cognito user, creating session');
          
          // Create a session-like object from Cognito user
          session = {
            user: {
              id: cognitoUser.userId,
              name: cognitoUser.attributes?.['given_name'] || cognitoUser.username,
              email: cognitoUser.attributes?.email || null,
              // Add any other needed fields
              cognitoFallback: true,
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
          };
        } else {
          logger.debug('[Session Route] No Cognito user found');
        }
      } catch (cognitoError) {
        logger.warn('[Session Route] Cognito error:', cognitoError.message);
        // Continue to return empty session below
      }
    }
    
    if (!session) {
      // Return a proper JSON response for no session
      logger.debug('[Session Route] No session available, returning empty session');
      return NextResponse.json({
        user: null,
        expires: null
      });
    }
    
    // Ensure session has the expected structure before returning
    const safeSession = {
      user: session.user || null,
      expires: session.expires || null
    };
    
    // Make sure it serializes correctly
    try {
      JSON.stringify(safeSession);
    } catch (error) {
      logger.error('[Session Route] Session serialization error:', error);
      return NextResponse.json({
        user: null,
        expires: null
      });
    }
    
    // Return sanitized session as JSON
    logger.debug('[Session Route] Returning valid session');
    return NextResponse.json(safeSession);
    
  } catch (error) {
    logger.error('[Session Route] Error getting session:', error);
    
    // Return a properly formatted error response
    return NextResponse.json({
      user: null,
      expires: null
    });
  }
} 