/**
 * User Management API - Accept Invitation Endpoint
 * Handles invitation acceptance and user onboarding
 */
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * POST /api/user-management/accept-invitation
 * Accept invitation and complete user setup
 */
export async function POST(request) {
  try {
    logger.info('[UserManagement] Processing invitation acceptance');
    
    const requestData = await request.json();
    const { token, password, userInfo } = requestData;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Validate invitation token
    const invitation = await validateInvitationToken(token);
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 400 }
      );
    }

    // Check if invitation has already been accepted
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 400 }
      );
    }

    // Find the Auth0 user
    const auth0User = await findAuth0UserByEmail(invitation.email);
    if (!auth0User) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }

    // Complete the user setup
    const completedUser = await completeUserSetup({
      auth0User,
      invitation,
      password,
      userInfo
    });

    // Mark invitation as accepted
    await markInvitationAccepted(invitation.id, auth0User.user_id);

    // Create local user record
    await createLocalUserRecord(completedUser, invitation);

    logger.info(`[UserManagement] Invitation accepted for: ${invitation.email}`);
    
    return NextResponse.json({
      message: 'Invitation accepted successfully',
      user: {
        id: completedUser.user_id,
        email: completedUser.email,
        name: completedUser.name,
        role: invitation.role,
        tenantId: invitation.tenantId
      },
      redirectUrl: '/dashboard'
    });
    
  } catch (error) {
    logger.error('[UserManagement] Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user-management/accept-invitation
 * Validate invitation token and get invitation details
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Validate invitation token
    const invitation = await validateInvitationToken(token);
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 400 }
      );
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 400 }
      );
    }

    // Get tenant information
    const tenantInfo = await getTenantInfo(invitation.tenantId);
    
    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        invitedBy: invitation.invitedByName,
        invitedAt: invitation.createdAt,
        expiresAt: invitation.expiresAt
      },
      tenant: tenantInfo,
      valid: true
    });
    
  } catch (error) {
    logger.error('[UserManagement] Error validating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to validate invitation', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper functions
 */
async function validateInvitationToken(token) {
  try {
    // Look up invitation by token
    const invitation = await findInvitationByToken(token);
    
    if (!invitation) {
      return null;
    }
    
    // Check if expired
    const now = new Date();
    const expiresAt = new Date(invitation.expiresAt);
    
    if (now > expiresAt) {
      logger.warn(`[UserManagement] Invitation expired: ${invitation.id}`);
      return null;
    }
    
    return invitation;
    
  } catch (error) {
    logger.error('[UserManagement] Error validating invitation token:', error);
    return null;
  }
}

async function findInvitationByToken(token) {
  // Mock implementation - replace with actual database lookup
  // This should query your invitations table
  return {
    id: 'invite-123',
    email: 'invited@example.com',
    role: 'USER',
    permissions: [],
    tenantId: 'tenant-123',
    invitedBy: 'user-123',
    invitedByName: 'Admin User',
    status: 'pending',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days from now
    token: token
  };
}

async function findAuth0UserByEmail(email) {
  try {
    const auth0Config = getAuth0Config();
    if (!auth0Config.isValid) {
      throw new Error('Auth0 configuration incomplete');
    }
    
    const token = await getAuth0ManagementToken(auth0Config);
    
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
      throw new Error('Failed to find Auth0 user');
    }
    
    const users = await response.json();
    return users.length > 0 ? users[0] : null;
    
  } catch (error) {
    logger.error('[UserManagement] Error finding Auth0 user:', error);
    return null;
  }
}

async function completeUserSetup({ auth0User, invitation, password, userInfo }) {
  try {
    const auth0Config = getAuth0Config();
    const token = await getAuth0ManagementToken(auth0Config);
    
    // Update Auth0 user with complete information
    const updateData = {
      email_verified: true,
      password: password,
      name: userInfo?.name || auth0User.name,
      app_metadata: {
        ...auth0User.app_metadata,
        tenantId: invitation.tenantId,
        role: invitation.role,
        permissions: invitation.permissions,
        inviteStatus: 'accepted',
        acceptedAt: new Date().toISOString(),
        onboardingCompleted: true
      },
      user_metadata: {
        ...auth0User.user_metadata,
        invitationAcceptedAt: new Date().toISOString(),
        setupCompleted: true
      }
    };
    
    // Remove password from update if not provided (user might set it via Auth0 UI)
    if (!password) {
      delete updateData.password;
    }
    
    const response = await fetch(`https://${auth0Config.domain}/api/v2/users/${auth0User.user_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to update Auth0 user: ${error.message}`);
    }
    
    return await response.json();
    
  } catch (error) {
    logger.error('[UserManagement] Error completing user setup:', error);
    throw error;
  }
}

async function markInvitationAccepted(invitationId, userId) {
  try {
    // Update invitation status in database
    await updateInvitationStatus(invitationId, {
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
      acceptedByUserId: userId
    });
    
  } catch (error) {
    logger.error('[UserManagement] Error marking invitation accepted:', error);
    throw error;
  }
}

async function updateInvitationStatus(invitationId, updateData) {
  // Mock implementation - replace with actual database update
  logger.info(`[UserManagement] Updating invitation status: ${invitationId}`);
}

async function createLocalUserRecord(auth0User, invitation) {
  try {
    const localUser = {
      id: generateLocalUserId(),
      auth0_id: auth0User.user_id,
      email: auth0User.email,
      name: auth0User.name,
      role: invitation.role,
      permissions: invitation.permissions,
      tenantId: invitation.tenantId,
      businessId: invitation.businessId,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      invitation_id: invitation.id,
      onboarding_completed: true
    };
    
    // Store in local database
    await storeLocalUser(localUser);
    
    // Check if we should create an employee record
    if (invitation.createEmployee && invitation.employeeData) {
      try {
        logger.info(`[UserManagement] Creating employee record for user ${auth0User.email}`);
        
        // Call backend API to create employee
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
        const response = await fetch(`${backendUrl}/auth/create-employee-for-user/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Request': 'true' // Internal API key or auth mechanism
          },
          body: JSON.stringify({
            user_email: auth0User.email,
            user_id: localUser.id,
            business_id: invitation.businessId,
            employee_data: {
              first_name: auth0User.given_name || auth0User.name || '',
              last_name: auth0User.family_name || '',
              email: auth0User.email,
              department: invitation.employeeData.department || '',
              job_title: invitation.employeeData.jobTitle || '',
              employment_type: invitation.employeeData.employmentType || 'FT'
            }
          })
        });
        
        if (!response.ok) {
          logger.error(`[UserManagement] Failed to create employee: ${response.statusText}`);
          // Don't throw - employee creation failure shouldn't block user creation
        } else {
          logger.info(`[UserManagement] Employee record created successfully for ${auth0User.email}`);
        }
        
      } catch (error) {
        logger.error('[UserManagement] Error creating employee record:', error);
        // Don't throw - employee creation failure shouldn't block user creation
      }
    }
    
    return localUser;
    
  } catch (error) {
    logger.error('[UserManagement] Error creating local user record:', error);
    throw error;
  }
}

function generateLocalUserId() {
  return `local_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function storeLocalUser(user) {
  // Mock implementation - replace with actual database storage
  logger.info(`[UserManagement] Storing local user: ${user.email}`);
}

async function getTenantInfo(tenantId) {
  try {
    // Mock implementation - replace with actual tenant lookup
    return {
      id: tenantId,
      name: 'Example Company',
      domain: 'example.com',
      plan: 'professional'
    };
    
  } catch (error) {
    logger.error('[UserManagement] Error getting tenant info:', error);
    return null;
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