/**
 * User Management API - Create User Endpoint
 * Directly creates users in Auth0 and backend database
 */
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getServerSession } from '@/lib/session';

/**
 * POST /api/user-management/create
 * Create user directly in Auth0 and backend
 */
export async function POST(request) {
  try {
    logger.info('[UserManagement] Processing user creation');
    
    // Get session and validate permissions
    const session = await getServerSession(request);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const currentUser = session.user;
    const tenantId = currentUser.tenantId || currentUser.tenant_id;
    const businessId = currentUser.business_id || currentUser.businessId || tenantId;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      );
    }

    // Check permissions
    if (!hasPermission(currentUser, 'manage_users')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create users' },
        { status: 403 }
      );
    }

    const userData = await request.json();
    
    // Validate user data
    const validation = validateUserData(userData);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid user data', details: validation.errors },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await checkUserExists(userData.email, tenantId, request);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      );
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();

    // Create user in Auth0
    const auth0User = await createAuth0User({
      email: userData.email,
      password: tempPassword,
      tenantId: tenantId,
      businessId: businessId,
      role: userData.role,
      permissions: userData.permissions
    });

    // Create user in backend database
    const backendUser = await createBackendUser({
      auth0Id: auth0User.user_id,
      email: userData.email,
      role: userData.role,
      tenantId: tenantId,
      businessId: businessId,
      permissions: userData.permissions,
      linkEmployee: userData.link_employee,
      employeeId: userData.employee_id,
      createEmployee: userData.create_employee,
      employeeData: userData.employee_data
    }, request);

    // Send password reset email
    await sendPasswordResetEmail(auth0User.user_id, userData.email);

    logger.info(`[UserManagement] User created successfully: ${userData.email}`);
    
    return NextResponse.json({
      user: {
        id: backendUser.id,
        email: backendUser.email,
        role: backendUser.role,
        status: 'active'
      },
      message: `User created successfully. Password reset email sent to ${userData.email}`
    }, { status: 201 });
    
  } catch (error) {
    logger.error('[UserManagement] Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Validate user creation data
 */
function validateUserData(data) {
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
  
  if (data.link_employee && !data.employee_id) {
    errors.push('Employee ID is required when linking to existing employee');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Check if user already exists
 */
async function checkUserExists(email, tenantId, request) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/rbac/direct-users/check-exists/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getBackendToken(request)}`
      },
      body: JSON.stringify({ email, tenant_id: tenantId })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.exists;
    }
    
    return false;
  } catch (error) {
    logger.error('[UserManagement] Error checking user existence:', error);
    return false;
  }
}

/**
 * Create user in Auth0
 */
async function createAuth0User(userData) {
  const auth0Config = getAuth0Config();
  if (!auth0Config.isValid) {
    throw new Error('Auth0 configuration is incomplete');
  }
  
  const token = await getAuth0ManagementToken(auth0Config);
  
  const createUserResponse = await fetch(`https://${auth0Config.domain}/api/v2/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: userData.email,
      password: userData.password,
      email_verified: false,
      connection: 'Username-Password-Authentication',
      app_metadata: {
        tenantId: userData.tenantId,
        tenant_id: userData.tenantId,
        businessId: userData.businessId,
        business_id: userData.businessId,
        role: userData.role,
        permissions: userData.permissions
      }
    })
  });
  
  if (!createUserResponse.ok) {
    const error = await createUserResponse.json();
    throw new Error(`Auth0 user creation failed: ${error.message}`);
  }
  
  return await createUserResponse.json();
}

/**
 * Create user in backend database
 */
async function createBackendUser(userData, request) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/rbac/direct-users/create/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getBackendToken(request)}`
    },
    body: JSON.stringify({
      auth0_id: userData.auth0Id,
      email: userData.email,
      role: userData.role,
      tenant_id: userData.tenantId,
      business_id: userData.businessId,
      permissions: userData.permissions,
      link_employee: userData.linkEmployee,
      employee_id: userData.employeeId,
      create_employee: userData.createEmployee,
      employee_data: userData.employeeData
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Backend user creation failed: ${error.message || 'Unknown error'}`);
  }
  
  return await response.json();
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(userId, email) {
  const auth0Config = getAuth0Config();
  const token = await getAuth0ManagementToken(auth0Config);
  
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
      ttl_sec: 7 * 24 * 60 * 60 // 7 days
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    logger.error('[UserManagement] Failed to send password reset email:', error);
    // Don't throw error - user is already created
  }
  
  return await response.json();
}

/**
 * Get Auth0 configuration
 */
function getAuth0Config() {
  const config = {
    domain: process.env.AUTH0_DOMAIN || process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-cbyy63jovi6zrcos.us.auth0.com',
    clientId: process.env.AUTH0_M2M_CLIENT_ID,
    clientSecret: process.env.AUTH0_M2M_CLIENT_SECRET,
    audience: process.env.AUTH0_AUDIENCE
  };
  
  return {
    ...config,
    isValid: !!(config.domain && config.clientId && config.clientSecret)
  };
}

/**
 * Get Auth0 Management API token
 */
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

/**
 * Generate secure temporary password
 */
function generateTempPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  let password = '';
  
  // Ensure at least one of each required character type
  password += 'A'; // Uppercase
  password += 'a'; // Lowercase
  password += '1'; // Number
  password += '!'; // Special
  
  // Fill rest with random characters
  for (let i = 4; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

/**
 * Get backend API token from session
 */
async function getBackendToken(request) {
  try {
    const session = await getServerSession(request);
    if (session && session.authToken) {
      return session.authToken;
    }
    // Fallback to environment variable if available
    return process.env.BACKEND_SERVICE_TOKEN || '';
  } catch (error) {
    logger.error('[UserManagement] Error getting backend token:', error);
    return '';
  }
}

/**
 * Check user permissions
 */
function hasPermission(user, permission) {
  if (user.role === 'OWNER') return true;
  if (user.role === 'ADMIN' && ['manage_users', 'invite_users'].includes(permission)) return true;
  
  return user.permissions && user.permissions.includes(permission);
}