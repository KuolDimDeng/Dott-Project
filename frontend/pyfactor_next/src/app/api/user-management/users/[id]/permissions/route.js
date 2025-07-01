/**
 * User Management API - User Permissions Endpoint
 * Handles updating user permissions
 */
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * GET /api/user-management/users/[id]/permissions
 * Get user permissions
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    logger.info(`[UserManagement] Fetching permissions for user: ${id}`);
    
    const session = await getSession(request);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const currentUser = session.user;
    const tenantId = currentUser.tenantId || currentUser.tenant_id;
    
    // Find the user
    const user = await findUserById(id, tenantId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if current user can view this user's permissions
    if (!canViewUserPermissions(currentUser, user)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      effectivePermissions: calculateEffectivePermissions(user)
    });
    
  } catch (error) {
    logger.error('[UserManagement] Error fetching user permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user-management/users/[id]/permissions
 * Update user permissions
 */
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    logger.info(`[UserManagement] Updating permissions for user: ${id}`);
    
    const session = await getSession(request);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const currentUser = session.user;
    const tenantId = currentUser.tenantId || currentUser.tenant_id;
    
    // Find the user
    const user = await findUserById(id, tenantId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (!canManageUserPermissions(currentUser, user)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update user permissions' },
        { status: 403 }
      );
    }

    const { permissions, role } = await request.json();
    
    // Validate permissions data
    const validation = validatePermissionsUpdate(permissions, role, currentUser, user);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid permissions data', details: validation.errors },
        { status: 400 }
      );
    }

    // Update user permissions
    const updatedUser = await updateUserPermissions(id, {
      permissions,
      role: role || user.role
    }, tenantId);
    
    logger.info(`[UserManagement] Updated permissions for user: ${updatedUser.email}`);
    
    return NextResponse.json({
      message: 'Permissions updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        permissions: updatedUser.permissions,
        effectivePermissions: calculateEffectivePermissions(updatedUser)
      }
    });
    
  } catch (error) {
    logger.error('[UserManagement] Error updating user permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update permissions', message: error.message },
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
    // Check Auth0 first
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
      role: user.app_metadata?.role || 'USER',
      permissions: user.app_metadata?.permissions || [],
      tenantId: user.app_metadata?.tenantId,
      status: user.email_verified ? 'active' : 'pending'
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

function canViewUserPermissions(currentUser, targetUser) {
  // Owners can view all user permissions
  if (currentUser.role === 'OWNER') return true;
  
  // Admins can view non-owner permissions
  if (currentUser.role === 'ADMIN' && targetUser.role !== 'OWNER') return true;
  
  // Users can view their own permissions
  if (currentUser.id === targetUser.id) return true;
  
  return false;
}

function canManageUserPermissions(currentUser, targetUser) {
  // Can't manage your own permissions in most cases
  if (currentUser.id === targetUser.id) {
    return false;
  }
  
  // Owners can manage all non-owner permissions
  if (currentUser.role === 'OWNER' && targetUser.role !== 'OWNER') return true;
  
  // Admins can manage user permissions but not other admin/owner permissions
  if (currentUser.role === 'ADMIN' && targetUser.role === 'USER') return true;
  
  return false;
}

function validatePermissionsUpdate(permissions, role, currentUser, targetUser) {
  const errors = [];
  
  // Validate permissions array
  if (permissions && !Array.isArray(permissions)) {
    errors.push('Permissions must be an array');
  }
  
  // Validate individual permissions
  if (permissions && Array.isArray(permissions)) {
    const validPermissions = getValidPermissions();
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
    
    if (invalidPermissions.length > 0) {
      errors.push(`Invalid permissions: ${invalidPermissions.join(', ')}`);
    }
  }
  
  // Validate role changes
  if (role && role !== targetUser.role) {
    if (!['ADMIN', 'USER'].includes(role)) {
      errors.push('Invalid role');
    }
    
    // Only owners can change roles
    if (currentUser.role !== 'OWNER') {
      errors.push('Only owners can change user roles');
    }
    
    // Can't promote to owner
    if (role === 'OWNER') {
      errors.push('Cannot promote users to owner role');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

function getValidPermissions() {
  // Return all valid permission IDs based on your menu structure
  return [
    // Create New permissions
    'create-new',
    'create-new-transaction',
    'create-new-pos',
    'create-new-product',
    'create-new-service',
    'create-new-invoice',
    'create-new-bill',
    'create-new-estimate',
    'create-new-customer',
    'create-new-vendor',
    
    // Main sections
    'dashboard',
    'calendar',
    
    // Sales permissions
    'sales',
    'sales-dashboard',
    'sales-products',
    'sales-services',
    'sales-customers',
    'sales-estimates',
    'sales-orders',
    'sales-invoices',
    'sales-reports',
    
    // Inventory permissions
    'inventory',
    'inventory-dashboard',
    'inventory-stock',
    'inventory-locations',
    'inventory-suppliers',
    'inventory-reports',
    
    // Payments permissions
    'payments',
    'payments-dashboard',
    'payments-receive',
    'payments-make',
    'payments-methods',
    'payments-recurring',
    'payments-refunds',
    
    // HR permissions
    'hr',
    'hr-dashboard',
    'hr-employees',
    'hr-timesheets',
    'hr-benefits',
    'hr-performance',
    
    // Banking permissions
    'banking',
    'banking-dashboard',
    'banking-connect',
    'banking-transactions',
    'banking-reconciliation',
    'banking-reports',
    
    // Purchases permissions
    'purchases',
    'purchases-dashboard',
    'purchases-orders',
    'purchases-bills',
    'purchases-expenses',
    'purchases-vendors',
    'purchases-reports',
    
    // Payroll permissions
    'payroll',
    'payroll-dashboard',
    'payroll-run',
    'payroll-schedule',
    'payroll-settings',
    'payroll-reports',
    'payroll-export',
    
    // Tax permissions
    'taxes',
    'taxes-dashboard',
    'taxes-forms',
    'taxes-filing',
    'taxes-deadlines',
    'taxes-settings',
    'taxes-reports',
    
    // Analytics permissions
    'analytics',
    'analytics-dashboard',
    'analytics-business',
    'analytics-financial',
    'analytics-sales',
    'analytics-customer',
    'analytics-inventory',
    
    // Smart Insights permissions
    'smart-insights',
    'smart-insights-dashboard',
    'smart-insights-claude',
    'smart-insights-query',
    'smart-insights-packages',
    'smart-insights-credits',
    'smart-insights-purchase',
    
    // Reports permissions
    'reports',
    'reports-dashboard',
    'reports-financial',
    'reports-sales',
    'reports-inventory',
    'reports-custom'
  ];
}

function calculateEffectivePermissions(user) {
  // Calculate effective permissions based on role and explicit permissions
  const rolePermissions = getRolePermissions(user.role);
  const explicitPermissions = user.permissions || [];
  
  // Combine and deduplicate
  const effective = [...new Set([...rolePermissions, ...explicitPermissions])];
  
  return effective.sort();
}

function getRolePermissions(role) {
  switch (role) {
    case 'OWNER':
      // Owners have all permissions
      return getValidPermissions();
      
    case 'ADMIN':
      // Admins have most permissions except some sensitive ones
      return getValidPermissions().filter(p => 
        !p.includes('smart-insights-purchase') && 
        !p.includes('payroll-settings')
      );
      
    case 'USER':
      // Users have basic permissions by default
      return [
        'dashboard',
        'calendar',
        'sales-dashboard',
        'inventory-dashboard',
        'reports-dashboard'
      ];
      
    default:
      return [];
  }
}

async function updateUserPermissions(userId, updateData, tenantId) {
  try {
    // Update in Auth0
    await updateAuth0UserPermissions(userId, updateData);
    
    // Update in local database if needed
    await updateLocalUserPermissions(userId, updateData, tenantId);
    
    // Return updated user
    return await findUserById(userId, tenantId);
    
  } catch (error) {
    logger.error('[UserManagement] Error updating user permissions:', error);
    throw error;
  }
}

async function updateAuth0UserPermissions(userId, updateData) {
  try {
    const auth0Config = getAuth0Config();
    if (!auth0Config.isValid) {
      throw new Error('Auth0 configuration incomplete');
    }
    
    const token = await getAuth0ManagementToken(auth0Config);
    
    const auth0UpdateData = {
      app_metadata: {
        permissions: updateData.permissions,
        role: updateData.role,
        permissionsUpdatedAt: new Date().toISOString()
      }
    };
    
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
    logger.error('[UserManagement] Error updating Auth0 user permissions:', error);
    throw error;
  }
}

async function updateLocalUserPermissions(userId, updateData, tenantId) {
  // Mock implementation - replace with actual database update
  logger.info(`[UserManagement] Updating local user permissions: ${userId}`);
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