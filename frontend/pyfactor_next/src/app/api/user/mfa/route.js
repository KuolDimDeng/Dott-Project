import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';
import { ManagementClient } from 'auth0';

// Initialize Auth0 Management Client
console.log('[MFA API] Initializing Auth0 Management Client with:', {
  domain: process.env.AUTH0_DOMAIN || 'NOT SET',
  hasM2MClientId: !!(process.env.AUTH0_M2M_CLIENT_ID || process.env.AUTH0_MANAGEMENT_CLIENT_ID),
  hasM2MSecret: !!(process.env.AUTH0_M2M_CLIENT_SECRET || process.env.AUTH0_MANAGEMENT_CLIENT_SECRET),
  clientId: process.env.AUTH0_M2M_CLIENT_ID ? 'M2M_CLIENT_ID' : process.env.AUTH0_MANAGEMENT_CLIENT_ID ? 'MANAGEMENT_CLIENT_ID' : 'NONE'
});

const management = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_M2M_CLIENT_ID || process.env.AUTH0_MANAGEMENT_CLIENT_ID,
  clientSecret: process.env.AUTH0_M2M_CLIENT_SECRET || process.env.AUTH0_MANAGEMENT_CLIENT_SECRET,
  scope: 'read:users update:users read:users_app_metadata update:users_app_metadata'
});

/**
 * GET - Get user's MFA settings
 */
export async function GET(request) {
  try {
    console.log('[MFA API GET] Starting request...');
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    
    console.log('[MFA API GET] Cookies:', { 
      hasSid: !!sidCookie, 
      hasSessionToken: !!sessionTokenCookie 
    });
    
    if (!sidCookie && !sessionTokenCookie) {
      console.error('[MFA API GET] No authentication cookies found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const sessionId = sidCookie?.value || sessionTokenCookie?.value;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    // Get user data from backend
    const response = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Cookie': `session_token=${sessionId}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to get session' }, { status: 401 });
    }
    
    const sessionData = await response.json();
    const auth0UserId = sessionData.auth0_user_id || sessionData.sub;
    
    if (!auth0UserId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }
    
    console.log('[MFA API GET] Getting user from Auth0 with ID:', auth0UserId);
    
    // Get user from Auth0
    let user;
    try {
      user = await management.getUser({ id: auth0UserId });
      console.log('[MFA API GET] Auth0 user retrieved:', { 
        id: user.user_id, 
        email: user.email,
        hasMetadata: !!user.user_metadata
      });
    } catch (auth0Error) {
      console.error('[MFA API GET] Auth0 getUser error:', auth0Error);
      throw auth0Error;
    }
    
    // Get MFA enrollments
    let enrollments = [];
    try {
      enrollments = await management.getGuardianEnrollments({ id: auth0UserId });
      console.log('[MFA API GET] MFA enrollments retrieved:', enrollments.length);
    } catch (enrollmentError) {
      console.error('[MFA API GET] Auth0 getGuardianEnrollments error:', enrollmentError);
      // Continue with empty enrollments if this fails
    }
    
    const mfaSettings = {
      enabled: user.user_metadata?.mfa_enabled || false,
      preferredMethod: user.user_metadata?.mfa_preferred_method || 'totp',
      enrollments: enrollments.map(e => ({
        id: e.id,
        status: e.status,
        type: e.type,
        name: e.name,
        enrolledAt: e.enrolled_at
      })),
      availableMethods: ['totp', 'email', 'recovery-code'],
      hasActiveEnrollment: enrollments.some(e => e.status === 'confirmed')
    };
    
    logger.info(`[MFA API] Retrieved MFA settings for user ${sessionData.email}`);
    
    return NextResponse.json(mfaSettings);
  } catch (error) {
    logger.error(`[MFA API] Error getting MFA settings: ${error.message}`);
    return NextResponse.json(
      { error: 'Failed to get MFA settings', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Update user's MFA settings
 */
export async function POST(request) {
  try {
    const { enabled, preferredMethod } = await request.json();
    
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    
    if (!sidCookie && !sessionTokenCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const sessionId = sidCookie?.value || sessionTokenCookie?.value;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    // Get user data from backend
    const response = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Cookie': `session_token=${sessionId}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to get session' }, { status: 401 });
    }
    
    const sessionData = await response.json();
    const auth0UserId = sessionData.auth0_user_id || sessionData.sub;
    
    if (!auth0UserId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }
    
    // Update user metadata in Auth0
    await management.updateUser(
      { id: auth0UserId },
      {
        user_metadata: {
          mfa_enabled: enabled,
          mfa_preferred_method: preferredMethod,
          mfa_updated_at: new Date().toISOString()
        }
      }
    );
    
    logger.info(`[MFA API] Updated MFA settings for user ${sessionData.email}`);
    
    return NextResponse.json({
      success: true,
      enabled,
      preferredMethod,
      message: enabled 
        ? 'MFA has been enabled. You will be prompted to set it up on your next login.'
        : 'MFA has been disabled.'
    });
  } catch (error) {
    logger.error(`[MFA API] Error updating MFA settings: ${error.message}`);
    return NextResponse.json(
      { error: 'Failed to update MFA settings', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove MFA enrollment
 */
export async function DELETE(request) {
  try {
    const { enrollmentId } = await request.json();
    
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    
    if (!sidCookie && !sessionTokenCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const sessionId = sidCookie?.value || sessionTokenCookie?.value;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    // Get user data from backend
    const response = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Cookie': `session_token=${sessionId}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to get session' }, { status: 401 });
    }
    
    const sessionData = await response.json();
    const auth0UserId = sessionData.auth0_user_id || sessionData.sub;
    
    if (!auth0UserId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }
    
    // Delete the enrollment
    await management.deleteGuardianEnrollment({ id: auth0UserId, enrollmentId });
    
    logger.info(`[MFA API] Removed MFA enrollment for user ${sessionData.email}`);
    
    return NextResponse.json({
      success: true,
      message: 'MFA method has been removed.'
    });
  } catch (error) {
    logger.error(`[MFA API] Error removing MFA enrollment: ${error.message}`);
    return NextResponse.json(
      { error: 'Failed to remove MFA enrollment', message: error.message },
      { status: 500 }
    );
  }
}