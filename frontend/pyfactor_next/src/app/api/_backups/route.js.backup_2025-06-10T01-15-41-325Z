import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
const AUTH0_MANAGEMENT_CLIENT_ID = process.env.AUTH0_MANAGEMENT_CLIENT_ID || AUTH0_CLIENT_ID;
const AUTH0_MANAGEMENT_CLIENT_SECRET = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET || AUTH0_CLIENT_SECRET;

/**
 * Validate Auth0 session
 */
async function validateAuth0Session(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return { isAuthenticated: false, error: 'No Auth0 session found', user: null };
    }
    
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    
    // Check if session is expired
    if (sessionData.accessTokenExpiresAt && Date.now() > sessionData.accessTokenExpiresAt) {
      return { isAuthenticated: false, error: 'Session expired', user: null };
    }
    
    if (!sessionData.user) {
      return { isAuthenticated: false, error: 'Invalid session data', user: null };
    }
    
    return { isAuthenticated: true, user: sessionData.user, sessionData, error: null };
  } catch (error) {
    logger.error('[Close Account] Session validation error:', error);
    return { isAuthenticated: false, error: 'Session validation failed', user: null };
  }
}

/**
 * Get Auth0 Management API access token
 */
async function getManagementToken() {
  try {
    const response = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: AUTH0_MANAGEMENT_CLIENT_ID,
        client_secret: AUTH0_MANAGEMENT_CLIENT_SECRET,
        audience: `https://${AUTH0_DOMAIN}/api/v2/`
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get management token: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    logger.error('[Close Account] Error getting management token:', error);
    throw error;
  }
}

/**
 * Delete user from Auth0
 */
async function deleteAuth0User(userId, managementToken) {
  try {
    const response = await fetch(`https://${AUTH0_DOMAIN}/api/v2/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${managementToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok && response.status !== 204) {
      const error = await response.text();
      throw new Error(`Failed to delete Auth0 user: ${response.status} - ${error}`);
    }

    logger.info('[Close Account] Successfully deleted Auth0 user:', userId);
    return true;
  } catch (error) {
    logger.error('[Close Account] Error deleting Auth0 user:', error);
    throw error;
  }
}

/**
 * Delete user data from backend
 */
async function deleteBackendUserData(userId, tenantId) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL;
    if (!backendUrl) {
      logger.warn('[Close Account] No backend URL configured, skipping backend deletion');
      return true;
    }

    // Call backend API to delete user data
    const response = await fetch(`${backendUrl}/api/users/close-account/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        tenant_id: tenantId
      })
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('[Close Account] Backend deletion failed:', error);
      // Don't throw error for backend failures - Auth0 deletion is more important
      return false;
    }

    logger.info('[Close Account] Successfully deleted backend user data');
    return true;
  } catch (error) {
    logger.error('[Close Account] Error deleting backend data:', error);
    // Don't throw error for backend failures
    return false;
  }
}

export async function POST(request) {
  try {
    // Validate Auth0 session
    const authResult = await validateAuth0Session(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: authResult.error },
        { status: 401 }
      );
    }

    const { user, sessionData } = authResult;
    const body = await request.json();
    const { reason, userId, tenantId } = body;

    // Use session user ID if not provided
    const userIdToDelete = userId || user.sub;
    
    logger.info('[Close Account] Processing account closure request:', {
      userId: userIdToDelete,
      tenantId,
      reason,
      sessionUser: user.email
    });

    // Step 1: Get Auth0 Management API token
    let managementToken;
    try {
      // Check if we have the necessary credentials
      if (!AUTH0_MANAGEMENT_CLIENT_ID || !AUTH0_MANAGEMENT_CLIENT_SECRET) {
        logger.warn('[Close Account] Management API credentials not configured');
        // For now, we'll just clear the session and return success
        // In production, you should configure the Management API
        const response = NextResponse.json({ 
          success: true,
          message: 'Account closure initiated. Please note: Full account deletion requires manual intervention.',
          warning: 'Management API not configured'
        });

        // Clear Auth0 session cookie
        response.cookies.set('appSession', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: -1,
          path: '/'
        });

        return response;
      }
      
      managementToken = await getManagementToken();
    } catch (error) {
      logger.error('[Close Account] Failed to get management token:', error);
      return NextResponse.json(
        { error: 'Failed to authenticate with account service' },
        { status: 500 }
      );
    }

    // Step 2: Delete backend data (non-blocking)
    const backendDeleted = await deleteBackendUserData(userIdToDelete, tenantId);
    if (!backendDeleted) {
      logger.warn('[Close Account] Backend deletion failed, but continuing with Auth0 deletion');
    }

    // Step 3: Delete Auth0 user
    try {
      await deleteAuth0User(userIdToDelete, managementToken);
    } catch (error) {
      logger.error('[Close Account] Failed to delete Auth0 user:', error);
      return NextResponse.json(
        { error: 'Failed to delete account. Please contact support.' },
        { status: 500 }
      );
    }

    // Log the closure reason for analytics
    logger.info('[Close Account] Account closed successfully:', {
      userId: userIdToDelete,
      reason,
      backendDeleted
    });

    // Clear the Auth0 session cookie
    const response = NextResponse.json({ 
      success: true,
      message: 'Account closed successfully'
    });

    // Clear Auth0 session cookie
    response.cookies.set('appSession', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: -1,
      path: '/'
    });

    return response;

  } catch (error) {
    logger.error('[Close Account] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}