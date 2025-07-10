/**
 * User Management API - Invite Endpoint
 * Handles user invitations via Auth0
 */
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * POST /api/user-management/invite
 * Send user invitation via Auth0
 */
export async function POST(request) {
  try {
    logger.info('[UserManagement] Processing user invitation');
    
    // Get session and validate permissions
    const session = await getSession(request);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const currentUser = session.user;
    const tenantId = currentUser.tenantId || currentUser.tenant_id;
    const businessId = currentUser.business_id || currentUser.businessId;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      );
    }
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Check permissions
    if (!hasPermission(currentUser, 'invite_users')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to invite users' },
        { status: 403 }
      );
    }

    const inviteData = await request.json();
    
    // Validate invite data
    const validation = validateInviteData(inviteData);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid invite data', details: validation.errors },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await checkUserExists(inviteData.email, tenantId);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists in this tenant' },
        { status: 409 }
      );
    }

    // Create invitation
    const invitation = await createInvitation({
      email: inviteData.email,
      role: inviteData.role,
      permissions: inviteData.permissions,
      tenantId: tenantId,
      businessId: businessId,
      invitedBy: currentUser.id,
      invitedByName: currentUser.name || currentUser.email
    });

    // Send Auth0 invitation
    if (inviteData.send_invite) {
      await sendAuth0Invitation(invitation);
    }

    logger.info(`[UserManagement] Invitation created for ${inviteData.email}`);
    
    return NextResponse.json({
      invitation: invitation,
      message: `Invitation sent to ${inviteData.email}`
    }, { status: 201 });
    
  } catch (error) {
    logger.error('[UserManagement] Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get session (reused from main route)
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
  // Mock session for now - integrate with your session management
  return {
    user: {
      id: 'user-123',
      email: 'user@example.com',
      name: 'Current User',
      tenantId: 'tenant-123',
      business_id: '8432ed61-16c8-4242-94fc-4c7e25ed5d07', // Mock business_id
      role: 'OWNER'
    }
  };
}

/**
 * Validate invitation data
 */
function validateInviteData(data) {
  const errors = [];
  
  if (!data.email) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }
  
  if (!data.role) {
    errors.push('Role is required');
  } else if (!['ADMIN', 'USER'].includes(data.role)) {
    errors.push('Invalid role. Must be ADMIN or USER');
  }
  
  if (data.permissions && !Array.isArray(data.permissions)) {
    errors.push('Permissions must be an array');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Check if user already exists in tenant
 */
async function checkUserExists(email, tenantId) {
  try {
    // Check local database first
    const localUser = await findLocalUser(email, tenantId);
    if (localUser) {
      return localUser;
    }
    
    // Check Auth0
    const auth0User = await findAuth0User(email, tenantId);
    return auth0User;
    
  } catch (error) {
    logger.error('[UserManagement] Error checking user existence:', error);
    return null;
  }
}

async function findLocalUser(email, tenantId) {
  // Mock implementation - replace with actual database query
  return null;
}

async function findAuth0User(email, tenantId) {
  try {
    const auth0Config = getAuth0Config();
    if (!auth0Config.isValid) {
      return null;
    }
    
    // Get Auth0 Management API token
    const token = await getAuth0ManagementToken(auth0Config);
    
    // Search for user by email with tenant filter
    const response = await fetch(
      `https://${auth0Config.domain}/api/v2/users-by-email?email=${encodeURIComponent(email)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      return null;
    }
    
    const users = await response.json();
    
    // Find user with matching tenant
    const userInTenant = users.find(user => 
      user.app_metadata?.tenantId === tenantId
    );
    
    return userInTenant || null;
    
  } catch (error) {
    logger.error('[UserManagement] Error finding Auth0 user:', error);
    return null;
  }
}

/**
 * Create invitation record
 */
async function createInvitation(inviteData) {
  const invitation = {
    id: `invite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    email: inviteData.email,
    role: inviteData.role,
    permissions: inviteData.permissions,
    tenantId: inviteData.tenantId,
    businessId: inviteData.businessId,
    invitedBy: inviteData.invitedBy,
    invitedByName: inviteData.invitedByName,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    token: generateInviteToken()
  };
  
  // Store invitation in database
  await storeInvitation(invitation);
  
  return invitation;
}

function generateInviteToken() {
  return `invite_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
}

async function storeInvitation(invitation) {
  // Mock implementation - replace with actual database storage
  logger.info(`[UserManagement] Storing invitation: ${invitation.id}`);
  return invitation;
}

/**
 * Send Auth0 invitation
 */
async function sendAuth0Invitation(invitation) {
  try {
    const auth0Config = getAuth0Config();
    if (!auth0Config.isValid) {
      throw new Error('Auth0 configuration is incomplete');
    }
    
    const token = await getAuth0ManagementToken(auth0Config);
    
    // Create user in Auth0 with invitation metadata
    const createUserResponse = await fetch(`https://${auth0Config.domain}/api/v2/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: invitation.email,
        email_verified: false,
        connection: 'Username-Password-Authentication', // Adjust based on your Auth0 setup
        password: generateTempPassword(),
        app_metadata: {
          tenantId: invitation.tenantId,
          businessId: invitation.businessId,
          business_id: invitation.businessId, // Also include snake_case for backend compatibility
          role: invitation.role,
          permissions: invitation.permissions,
          invitationId: invitation.id,
          invitedBy: invitation.invitedBy,
          inviteStatus: 'pending'
        },
        user_metadata: {
          invitedAt: invitation.createdAt,
          invitedByName: invitation.invitedByName
        }
      })
    });
    
    if (!createUserResponse.ok) {
      const error = await createUserResponse.json();
      throw new Error(`Auth0 user creation failed: ${error.message}`);
    }
    
    const auth0User = await createUserResponse.json();
    
    // Send password reset email as invitation
    await sendPasswordResetAsInvite(auth0Config, token, auth0User.user_id, invitation);
    
    logger.info(`[UserManagement] Auth0 invitation sent to ${invitation.email}`);
    
  } catch (error) {
    logger.error('[UserManagement] Error sending Auth0 invitation:', error);
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

function generateTempPassword() {
  // Generate a secure temporary password
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function sendPasswordResetAsInvite(auth0Config, token, userId, invitation) {
  // Send password reset email which serves as the invitation
  const response = await fetch(`https://${auth0Config.domain}/api/v2/tickets/password-change`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id: userId,
      client_id: auth0Config.clientId,
      connection_id: 'Username-Password-Authentication',
      result_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation?token=${invitation.token}`,
      ttl_sec: 7 * 24 * 60 * 60 // 7 days
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to send invitation email: ${error.message}`);
  }
  
  return await response.json();
}

/**
 * Check user permissions
 */
function hasPermission(user, permission) {
  if (user.role === 'OWNER') return true;
  if (user.role === 'ADMIN' && ['invite_users', 'manage_users'].includes(permission)) return true;
  
  return user.permissions && user.permissions.includes(permission);
}