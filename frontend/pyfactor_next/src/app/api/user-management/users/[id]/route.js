/**
 * User Management API - Individual User Endpoint
 * Handles operations on specific users
 */
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * GET /api/user-management/users/[id]
 * Get specific user details
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    logger.info(`[UserManagement] Fetching user: ${id}`);
    
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

    // Find user by ID in tenant
    const user = await findUserById(id, tenantId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if current user can view this user
    if (!canViewUser(currentUser, user)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ user });
    
  } catch (error) {
    logger.error('[UserManagement] Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user-management/users/[id]
 * Update user details
 */
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    logger.info(`[UserManagement] Updating user: ${id}`);
    
    const session = await getSession(request);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const currentUser = session.user;
    const tenantId = currentUser.tenantId || currentUser.tenant_id;
    
    // Find user to update
    const existingUser = await findUserById(id, tenantId);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (!canManageUser(currentUser, existingUser)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update this user' },
        { status: 403 }
      );
    }

    const updateData = await request.json();
    
    // Validate update data
    const validation = validateUpdateData(updateData, currentUser, existingUser);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid update data', details: validation.errors },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = await updateUser(id, updateData, tenantId);
    
    logger.info(`[UserManagement] Updated user: ${updatedUser.email}`);
    
    return NextResponse.json({
      user: updatedUser,
      message: 'User updated successfully'
    });
    
  } catch (error) {
    logger.error('[UserManagement] Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user-management/users/[id]
 * Remove user from tenant
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    logger.info(`[UserManagement] Deleting user: ${id}`);
    
    const session = await getSession(request);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const currentUser = session.user;
    const tenantId = currentUser.tenantId || currentUser.tenant_id;
    
    // Find user to delete
    const userToDelete = await findUserById(id, tenantId);
    if (!userToDelete) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check permissions and business rules
    const deleteValidation = validateUserDeletion(currentUser, userToDelete);
    if (!deleteValidation.valid) {
      return NextResponse.json(
        { error: deleteValidation.error },
        { status: deleteValidation.status }
      );
    }

    // Soft delete user (remove from tenant, keep Auth0 record)
    await removeUserFromTenant(id, tenantId);
    
    logger.info(`[UserManagement] Removed user from tenant: ${userToDelete.email}`);
    
    return NextResponse.json({
      message: 'User removed successfully'
    });
    
  } catch (error) {
    logger.error('[UserManagement] Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to remove user', message: error.message },
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

async function findUserById(userId, tenantId) {
  try {
    // First check local database
    const localUser = await findLocalUserById(userId, tenantId);
    if (localUser) {
      return localUser;
    }
    
    // Then check Auth0
    const auth0User = await findAuth0UserById(userId, tenantId);
    return auth0User;
    
  } catch (error) {
    logger.error('[UserManagement] Error finding user by ID:', error);
    return null;
  }
}

async function findLocalUserById(userId, tenantId) {
  // Mock implementation - replace with actual database query
  return null;
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
      invite_status: user.email_verified ? 'accepted' : 'pending'
    };
    
  } catch (error) {
    logger.error('[UserManagement] Error finding Auth0 user by ID:', error);
    return null;
  }
}

function canViewUser(currentUser, targetUser) {
  // Owners can view all users
  if (currentUser.role === 'OWNER') return true;
  
  // Admins can view non-owner users
  if (currentUser.role === 'ADMIN' && targetUser.role !== 'OWNER') return true;
  
  // Users can only view themselves
  if (currentUser.id === targetUser.id) return true;
  
  return false;
}

function canManageUser(currentUser, targetUser) {
  // Can't manage yourself in certain contexts
  if (currentUser.id === targetUser.id) {
    // Allow self-updates for non-critical fields only
    return true;
  }
  
  // Owners can manage all except other owners
  if (currentUser.role === 'OWNER' && targetUser.role !== 'OWNER') return true;
  
  // Admins can manage users but not other admins or owners
  if (currentUser.role === 'ADMIN' && targetUser.role === 'USER') return true;
  
  return false;
}

function validateUpdateData(updateData, currentUser, existingUser) {
  const errors = [];
  
  // Validate email if being updated
  if (updateData.email && updateData.email !== existingUser.email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)) {
      errors.push('Invalid email format');
    }
  }
  
  // Validate role updates
  if (updateData.role && updateData.role !== existingUser.role) {
    if (!['ADMIN', 'USER'].includes(updateData.role)) {
      errors.push('Invalid role');
    }
    
    // Only owners can change roles
    if (currentUser.role !== 'OWNER') {
      errors.push('Only owners can change user roles');
    }
    
    // Can't promote to owner
    if (updateData.role === 'OWNER') {
      errors.push('Cannot promote users to owner role');
    }
  }
  
  // Validate permissions
  if (updateData.permissions && !Array.isArray(updateData.permissions)) {
    errors.push('Permissions must be an array');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

function validateUserDeletion(currentUser, userToDelete) {
  // Can't delete yourself
  if (currentUser.id === userToDelete.id) {
    return {
      valid: false,
      error: 'Cannot delete your own account',
      status: 400
    };
  }
  
  // Can't delete owners
  if (userToDelete.role === 'OWNER') {
    return {
      valid: false,
      error: 'Cannot delete owner accounts',
      status: 400
    };
  }
  
  // Only owners can delete admins
  if (userToDelete.role === 'ADMIN' && currentUser.role !== 'OWNER') {
    return {
      valid: false,
      error: 'Only owners can delete admin accounts',
      status: 403
    };
  }
  
  // Check general permission
  if (!canManageUser(currentUser, userToDelete)) {
    return {
      valid: false,
      error: 'Insufficient permissions to delete this user',
      status: 403
    };
  }
  
  return { valid: true };
}

async function updateUser(userId, updateData, tenantId) {
  try {
    // Update in Auth0
    await updateAuth0User(userId, updateData);
    
    // Update in local database if needed
    await updateLocalUser(userId, updateData, tenantId);
    
    // Return updated user
    return await findUserById(userId, tenantId);
    
  } catch (error) {
    logger.error('[UserManagement] Error updating user:', error);
    throw error;
  }
}

async function updateAuth0User(userId, updateData) {
  try {
    const auth0Config = getAuth0Config();
    if (!auth0Config.isValid) {
      throw new Error('Auth0 configuration incomplete');
    }
    
    const token = await getAuth0ManagementToken(auth0Config);
    
    const auth0UpdateData = {};
    
    // Map frontend fields to Auth0 fields
    if (updateData.name) auth0UpdateData.name = updateData.name;
    if (updateData.email) auth0UpdateData.email = updateData.email;
    
    // Update app_metadata
    if (updateData.role || updateData.permissions) {
      auth0UpdateData.app_metadata = {};
      if (updateData.role) auth0UpdateData.app_metadata.role = updateData.role;
      if (updateData.permissions) auth0UpdateData.app_metadata.permissions = updateData.permissions;
    }
    
    const response = await fetch(`https://${auth0Config.domain}/api/v2/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(auth0UpdateData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Auth0 update failed: ${error.message}`);
    }
    
    return await response.json();
    
  } catch (error) {
    logger.error('[UserManagement] Error updating Auth0 user:', error);
    throw error;
  }
}

async function updateLocalUser(userId, updateData, tenantId) {
  // Mock implementation - replace with actual database update
  logger.info(`[UserManagement] Updating local user: ${userId}`);
}

async function removeUserFromTenant(userId, tenantId) {
  try {
    // Update Auth0 user to remove tenant association
    await removeUserFromAuth0Tenant(userId);
    
    // Remove from local database
    await removeLocalUserFromTenant(userId, tenantId);
    
  } catch (error) {
    logger.error('[UserManagement] Error removing user from tenant:', error);
    throw error;
  }
}

async function removeUserFromAuth0Tenant(userId) {
  try {
    const auth0Config = getAuth0Config();
    if (!auth0Config.isValid) {
      throw new Error('Auth0 configuration incomplete');
    }
    
    const token = await getAuth0ManagementToken(auth0Config);
    
    // Remove tenant from app_metadata
    const response = await fetch(`https://${auth0Config.domain}/api/v2/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_metadata: {
          tenantId: null,
          role: null,
          permissions: null,
          removedAt: new Date().toISOString()
        }
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Auth0 tenant removal failed: ${error.message}`);
    }
    
  } catch (error) {
    logger.error('[UserManagement] Error removing user from Auth0 tenant:', error);
    throw error;
  }
}

async function removeLocalUserFromTenant(userId, tenantId) {
  // Mock implementation - replace with actual database removal
  logger.info(`[UserManagement] Removing local user from tenant: ${userId}`);
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