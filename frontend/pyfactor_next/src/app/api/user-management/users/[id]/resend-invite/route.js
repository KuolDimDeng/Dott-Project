/**
 * User Management API - Resend Invitation Endpoint
 * Handles resending invitations to pending users
 */
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * POST /api/user-management/users/[id]/resend-invite
 * Resend invitation to a pending user
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    logger.info(`[UserManagement] Resending invitation for user: ${id}`);
    
    const session = await getSession(request);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const currentUser = session.user;
    const tenantId = currentUser.tenantId || currentUser.tenant_id;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      );
    }

    // Check permissions
    if (!hasPermission(currentUser, 'invite_users')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to resend invitations' },
        { status: 403 }
      );
    }

    // Find the user
    const user = await findUserById(id, tenantId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Validate that user is in pending state
    if (user.status === 'active' || user.invite_status === 'accepted') {
      return NextResponse.json(
        { error: 'User has already accepted the invitation' },
        { status: 400 }
      );
    }

    // Check rate limiting
    const rateLimitCheck = await checkResendRateLimit(id);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many resend attempts. Please wait before trying again.' },
        { status: 429 }
      );
    }

    // Resend the invitation
    await resendInvitation(user, currentUser);
    
    // Update rate limiting
    await updateResendRateLimit(id);
    
    logger.info(`[UserManagement] Invitation resent to: ${user.email}`);
    
    return NextResponse.json({
      message: `Invitation resent to ${user.email}`,
      user: {
        ...user,
        lastInviteSent: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('[UserManagement] Error resending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to resend invitation', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper functions
 */
async function getSession(request) {
  try {
    const cookies = request.headers.get('cookie') || '';
    const sessionId = extractSessionId(cookies);
    
    if (!sessionId) {
      return null;
    }
    
    const session = await validateSession(sessionId);
    return session;
    
  } catch (error) {
    logger.error('[UserManagement] Session validation failed:', error);
    return null;
  }
}

function extractSessionId(cookieString) {
  const cookies = cookieString.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});
  
  return cookies.sid || cookies.session_token;
}

async function validateSession(sessionId) {
  // Mock session for now
  return {
    user: {
      id: 'user-123',
      email: 'user@example.com',
      name: 'Current User',
      tenantId: 'tenant-123',
      role: 'OWNER'
    }
  };
}

function hasPermission(user, permission) {
  if (user.role === 'OWNER') return true;
  if (user.role === 'ADMIN' && ['invite_users', 'manage_users'].includes(permission)) return true;
  
  return user.permissions && user.permissions.includes(permission);
}

async function findUserById(userId, tenantId) {
  try {
    // Check Auth0 first since pending users are likely there
    const auth0User = await findAuth0UserById(userId, tenantId);
    if (auth0User) {
      return auth0User;
    }
    
    // Check local database
    const localUser = await findLocalUserById(userId, tenantId);
    return localUser;
    
  } catch (error) {
    logger.error('[UserManagement] Error finding user by ID:', error);
    return null;
  }
}

async function findAuth0UserById(userId, tenantId) {
  try {
    const auth0Config = getAuth0Config();
    if (!auth0Config.isValid) {
      return null;
    }
    
    const token = await getAuth0ManagementToken(auth0Config);
    
    const response = await fetch(`https://${auth0Config.domain}/api/v2/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const user = await response.json();
    
    // Verify user belongs to tenant
    if (user.app_metadata?.tenantId !== tenantId) {
      return null;
    }
    
    return {
      id: user.user_id,
      auth0_id: user.user_id,
      email: user.email,
      name: user.name || user.nickname,
      status: user.email_verified ? 'active' : 'pending',
      last_login: user.last_login,
      created_at: user.created_at,
      updated_at: user.updated_at,
      mfa_enabled: user.multifactor && user.multifactor.length > 0,
      role: user.app_metadata?.role || 'USER',
      permissions: user.app_metadata?.permissions || [],
      tenantId: user.app_metadata?.tenantId,
      invite_status: user.email_verified ? 'accepted' : 'pending',
      invitationId: user.app_metadata?.invitationId,
      invitedBy: user.app_metadata?.invitedBy
    };
    
  } catch (error) {
    logger.error('[UserManagement] Error finding Auth0 user by ID:', error);
    return null;
  }
}

async function findLocalUserById(userId, tenantId) {
  // Mock implementation - replace with actual database query
  return null;
}

async function checkResendRateLimit(userId) {
  try {
    // Get rate limit data from cache/database
    const rateLimitData = await getRateLimitData(userId);
    
    if (!rateLimitData) {
      return { allowed: true };
    }
    
    const now = new Date();
    const lastResend = new Date(rateLimitData.lastResend);
    const minutesSinceLastResend = (now - lastResend) / (1000 * 60);
    
    // Allow resend if more than 5 minutes have passed
    if (minutesSinceLastResend >= 5) {
      return { allowed: true };
    }
    
    // Check daily limit (max 5 resends per day)
    const today = now.toDateString();
    const isToday = lastResend.toDateString() === today;
    
    if (isToday && rateLimitData.resendCount >= 5) {
      return { 
        allowed: false, 
        reason: 'Daily limit exceeded',
        resetTime: new Date(now.getTime() + (24 * 60 * 60 * 1000))
      };
    }
    
    if (minutesSinceLastResend < 5) {
      return { 
        allowed: false, 
        reason: 'Too soon',
        waitTime: Math.ceil(5 - minutesSinceLastResend)
      };
    }
    
    return { allowed: true };
    
  } catch (error) {
    logger.error('[UserManagement] Error checking rate limit:', error);
    // Allow on error to avoid blocking legitimate requests
    return { allowed: true };
  }
}

async function getRateLimitData(userId) {
  // Mock implementation - replace with actual cache/database lookup
  // This should store: lastResend timestamp, resendCount for today
  return null;
}

async function updateResendRateLimit(userId) {
  try {
    const now = new Date();
    const rateLimitData = await getRateLimitData(userId) || { resendCount: 0 };
    
    // Check if it's a new day
    const lastResend = rateLimitData.lastResend ? new Date(rateLimitData.lastResend) : null;
    const isNewDay = !lastResend || lastResend.toDateString() !== now.toDateString();
    
    const newRateLimitData = {
      lastResend: now.toISOString(),
      resendCount: isNewDay ? 1 : (rateLimitData.resendCount + 1)
    };
    
    // Store rate limit data
    await storeRateLimitData(userId, newRateLimitData);
    
  } catch (error) {
    logger.error('[UserManagement] Error updating rate limit:', error);
  }
}

async function storeRateLimitData(userId, data) {
  // Mock implementation - replace with actual cache/database storage
  logger.info(`[UserManagement] Storing rate limit data for user: ${userId}`);
}

async function resendInvitation(user, currentUser) {
  try {
    // Generate new invitation token
    const newToken = generateInviteToken();
    
    // Update invitation record if exists
    await updateInvitationRecord(user.invitationId, {
      resentAt: new Date().toISOString(),
      resentBy: currentUser.id,
      newToken: newToken
    });
    
    // Send new password reset email
    await sendPasswordResetAsInvite(user, newToken);
    
    logger.info(`[UserManagement] Invitation resent to ${user.email}`);
    
  } catch (error) {
    logger.error('[UserManagement] Error resending invitation:', error);
    throw error;
  }
}

function generateInviteToken() {
  return `invite_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
}

async function updateInvitationRecord(invitationId, updateData) {
  if (!invitationId) {
    return;
  }
  
  // Mock implementation - replace with actual database update
  logger.info(`[UserManagement] Updating invitation record: ${invitationId}`);
}

async function sendPasswordResetAsInvite(user, token) {
  try {
    const auth0Config = getAuth0Config();
    if (!auth0Config.isValid) {
      throw new Error('Auth0 configuration incomplete');
    }
    
    const managementToken = await getAuth0ManagementToken(auth0Config);
    
    // Send password reset email which serves as the invitation
    const response = await fetch(`https://${auth0Config.domain}/api/v2/tickets/password-change`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${managementToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: user.auth0_id || user.id,
        client_id: auth0Config.clientId,
        connection_id: 'Username-Password-Authentication',
        result_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation?token=${token}`,
        ttl_sec: 7 * 24 * 60 * 60 // 7 days
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to send invitation email: ${error.message}`);
    }
    
    const result = await response.json();
    logger.info(`[UserManagement] Password reset ticket created: ${result.ticket}`);
    
    return result;
    
  } catch (error) {
    logger.error('[UserManagement] Error sending password reset as invite:', error);
    throw error;
  }
}

function getAuth0Config() {
  const config = {
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    audience: process.env.AUTH0_AUDIENCE
  };
  
  return {
    ...config,
    isValid: !!(config.domain && config.clientId && config.clientSecret)
  };
}

async function getAuth0ManagementToken(auth0Config) {
  const response = await fetch(`https://${auth0Config.domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: auth0Config.clientId,
      client_secret: auth0Config.clientSecret,
      audience: `https://${auth0Config.domain}/api/v2/`,
      grant_type: 'client_credentials'
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to get Auth0 management token');
  }
  
  const data = await response.json();
  return data.access_token;
}