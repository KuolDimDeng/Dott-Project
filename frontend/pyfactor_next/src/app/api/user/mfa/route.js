import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';
import { ManagementClient } from 'auth0';

// Initialize Auth0 Management Client
const management = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_M2M_CLIENT_ID,
  clientSecret: process.env.AUTH0_M2M_CLIENT_SECRET,
  scope: 'read:users update:users read:users_app_metadata update:users_app_metadata'
});

/**
 * GET - Get user's MFA settings
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
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
    
    // Get user from Auth0
    const user = await management.getUser({ id: auth0UserId });
    
    // Get MFA enrollments
    const enrollments = await management.getGuardianEnrollments({ id: auth0UserId });
    
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
    
    const cookieStore = await cookies();
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
    
    const cookieStore = await cookies();
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