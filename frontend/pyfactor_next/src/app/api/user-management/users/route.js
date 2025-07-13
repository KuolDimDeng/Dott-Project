/**
 * User Management API - Main Users Endpoint
 * Handles application users (not HR employees)
 * Integrates with Auth0 and local user records
 */
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * GET /api/user-management/users
 * Fetch all users for the current tenant
 */
export async function GET(request) {
  try {
    logger.info('[UserManagement] ========== GET USERS REQUEST START ==========');
    logger.info('[UserManagement] Request URL:', request.url);
    logger.info('[UserManagement] Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Get session and user info from request headers/cookies
    const session = await getSession(request);
    logger.info('[UserManagement] Session result:', session);
    
    if (!session || !session.user) {
      logger.error('[UserManagement] Authentication failed - no session or user');
      logger.error('[UserManagement] Session details:', { 
        hasSession: !!session, 
        hasUser: session?.user ? true : false,
        sessionKeys: session ? Object.keys(session) : [],
        userKeys: session?.user ? Object.keys(session.user) : []
      });
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

    // Check if we should only return unlinked users
    const url = new URL(request.url);
    const unlinkedOnly = url.searchParams.get('unlinked') === 'true';
    
    // Fetch users from local database (tenant-scoped)
    const localUsers = await fetchLocalUsers(tenantId, currentUser, request, unlinkedOnly);
    
    // Fetch Auth0 users for this tenant
    const auth0Users = await fetchAuth0UsersForTenant(tenantId);
    
    // Merge and normalize user data
    const mergedUsers = mergeUserData(localUsers, auth0Users);
    
    logger.info(`[UserManagement] Found ${mergedUsers.length} users for tenant ${tenantId}`);
    
    return NextResponse.json({
      users: mergedUsers,
      total: mergedUsers.length
    });
    
  } catch (error) {
    logger.error('[UserManagement] Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user-management/users
 * Create a new user (typically internal - invites use separate endpoint)
 */
export async function POST(request) {
  try {
    logger.info('[UserManagement] Creating new user');
    
    const session = await getSession(request);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const currentUser = session.user;
    const tenantId = currentUser.tenantId || currentUser.tenant_id;
    
    // Check if current user has permission to create users
    if (!hasPermission(currentUser, 'manage_users')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const userData = await request.json();
    
    // Validate required fields
    if (!userData.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Create user in Auth0 and local database
    const newUser = await createUser({
      ...userData,
      tenantId,
      createdBy: currentUser.id
    });
    
    logger.info(`[UserManagement] Created user: ${newUser.email}`);
    
    return NextResponse.json({
      user: newUser,
      message: 'User created successfully'
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
 * Helper function to get session from request - get real user data from backend
 */
async function getSession(request) {
  try {
    logger.info('[UserManagement] ========== GET SESSION START ==========');
    logger.info('[UserManagement] Request URL:', request.url);
    logger.info('[UserManagement] Request method:', request.method);
    logger.info('[UserManagement] Origin:', request.nextUrl.origin);
    
    // Get cookies from request headers
    const cookieHeader = request.headers.get('cookie') || '';
    logger.info('[UserManagement] Cookie header:', cookieHeader);
    logger.info('[UserManagement] Cookie header length:', cookieHeader.length);
    logger.info('[UserManagement] Has sid cookie:', cookieHeader.includes('sid='));
    logger.info('[UserManagement] Has sessionToken cookie:', cookieHeader.includes('sessionToken='));
    
    if (!cookieHeader || !cookieHeader.includes('sid=')) {
      logger.warn('[UserManagement] No session cookie found in request');
      return null;
    }
    
    // Extract sid value for logging
    const sidMatch = cookieHeader.match(/sid=([^;]+)/);
    const sidValue = sidMatch ? sidMatch[1] : 'not found';
    logger.info('[UserManagement] SID value:', sidValue.substring(0, 8) + '...');
    
    // First try to get user info from session-v2 endpoint (internal call)
    logger.info('[UserManagement] Calling session-v2 endpoint...');
    const sessionResponse = await fetch(`${request.nextUrl.origin}/api/auth/session-v2`, {
      headers: {
        'cookie': cookieHeader,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    logger.info('[UserManagement] Session-v2 response status:', sessionResponse.status);
    logger.info('[UserManagement] Session-v2 response ok:', sessionResponse.ok);
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      logger.info('[UserManagement] Session-v2 response data:', sessionData);
      logger.info('[UserManagement] Session data keys:', Object.keys(sessionData));
      logger.info('[UserManagement] Has user in session data:', !!sessionData.user);
      
      if (sessionData && sessionData.user) {
        logger.info('[UserManagement] User data from session-v2:', sessionData.user);
        logger.info('[UserManagement] User data keys:', Object.keys(sessionData.user));
        
        const user = {
          id: sessionData.user.sub || sessionData.user.id,
          email: sessionData.user.email,
          name: sessionData.user.name || sessionData.user.email,
          tenantId: sessionData.user.tenantId || sessionData.user.tenant_id,
          role: sessionData.user.role || 'OWNER',
          mfa_enabled: sessionData.user.mfa_enabled || false,
          permissions: sessionData.user.permissions || [],
          sessionToken: sessionData.accessToken || sessionData.access_token,
          sessionId: sessionData.sessionId || sessionData.sid
        };
        
        logger.info('[UserManagement] Constructed user object:', user);
        logger.info('[UserManagement] Got real session data from session-v2');
        return { user };
      } else {
        logger.warn('[UserManagement] Session data exists but no user found');
      }
    } else {
      logger.warn('[UserManagement] Session-v2 request failed:', sessionResponse.status);
      const errorText = await sessionResponse.text().catch(() => 'Could not read error');
      logger.warn('[UserManagement] Session-v2 error response:', errorText);
    }
    
    // Fallback: try unified profile endpoint (internal call)
    logger.info('[UserManagement] Trying profile endpoint fallback...');
    const profileResponse = await fetch(`${request.nextUrl.origin}/api/user/profile`, {
      headers: {
        'cookie': cookieHeader,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    logger.info('[UserManagement] Profile response status:', profileResponse.status);
    logger.info('[UserManagement] Profile response ok:', profileResponse.ok);
    
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      logger.info('[UserManagement] Profile response data:', profileData);
      logger.info('[UserManagement] Profile data keys:', Object.keys(profileData));
      
      if (profileData) {
        const user = {
          id: profileData.id || profileData.userId,
          email: profileData.email,
          name: profileData.name || profileData.email,
          tenantId: profileData.tenantId || profileData.tenant_id,
          role: profileData.role || 'OWNER',
          mfa_enabled: profileData.mfa_enabled || false,
          permissions: profileData.permissions || [],
          sessionToken: profileData.accessToken || profileData.access_token,
          sessionId: profileData.sessionId || profileData.sid
        };
        
        logger.info('[UserManagement] Constructed user from profile:', user);
        logger.info('[UserManagement] Got real user data from profile endpoint');
        return { user };
      }
    } else {
      logger.warn('[UserManagement] Profile request failed:', profileResponse.status);
      const errorText = await profileResponse.text().catch(() => 'Could not read error');
      logger.warn('[UserManagement] Profile error response:', errorText);
    }
    
    logger.warn('[UserManagement] ========== NO VALID SESSION FOUND ==========');
    return null;
    
  } catch (error) {
    logger.error('[UserManagement] ========== SESSION RETRIEVAL ERROR ==========');
    logger.error('[UserManagement] Session retrieval failed:', error);
    logger.error('[UserManagement] Error stack:', error.stack);
    return null;
  }
}


/**
 * Helper function to fetch local users from database
 */
async function fetchLocalUsers(tenantId, currentUser, request, unlinkedOnly = false) {
  try {
    logger.info('[UserManagement] ========== FETCH LOCAL USERS START ==========');
    
    // Fetch users from backend RBAC API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    logger.info('[UserManagement] Backend URL:', backendUrl);
    logger.info('[UserManagement] Tenant ID:', tenantId);
    logger.info('[UserManagement] Unlinked only:', unlinkedOnly);
    
    // Forward cookies for session-based authentication
    const cookieHeader = request?.headers?.get('cookie') || '';
    logger.info('[UserManagement] Cookie header for backend:', cookieHeader);
    logger.info('[UserManagement] Current user:', currentUser);
    
    // Add unlinked parameter if requested
    const queryParams = unlinkedOnly ? '?unlinked=true' : '';
    const fullUrl = `${backendUrl}/auth/rbac/users/${queryParams}`;
    logger.info('[UserManagement] Full backend URL:', fullUrl);
    
    // Extract session ID for additional header
    const sidMatch = cookieHeader.match(/sid=([^;]+)/);
    const sessionId = sidMatch ? sidMatch[1] : null;
    logger.info('[UserManagement] Extracted session ID:', sessionId ? sessionId.substring(0, 8) + '...' : 'none');
    
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader,
      'X-Tenant-ID': tenantId
    };
    
    if (sessionId) {
      headers['X-Session-ID'] = sessionId;
    }
    
    logger.info('[UserManagement] Request headers to backend:', headers);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });
    
    logger.info('[UserManagement] Backend response status:', response.status);
    logger.info('[UserManagement] Backend response ok:', response.ok);
    logger.info('[UserManagement] Backend response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error');
      logger.warn(`[UserManagement] Backend API returned ${response.status}: ${response.statusText}`);
      logger.warn('[UserManagement] Backend error response:', errorText);
      
      // If backend is not available, return at least the current user
      if (currentUser && currentUser.tenantId === tenantId) {
        return [{
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name || currentUser.email,
          role: currentUser.role || 'OWNER',
          status: 'active',
          tenantId: tenantId,
          permissions: currentUser.permissions || [],
          created_at: currentUser.created_at || new Date().toISOString(),
          last_login: new Date().toISOString(),
          mfa_enabled: currentUser.mfa_enabled || false,
          invite_status: 'accepted'
        }];
      }
      return [];
    }
    
    const data = await response.json();
    const users = Array.isArray(data) ? data : (data.results || data.users || []);
    
    // Transform backend user data to frontend format
    return users.map(user => ({
      id: user.id || user.user_id,
      email: user.email,
      name: user.name || user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      role: user.role || 'USER',
      status: user.is_active ? 'active' : 'inactive',
      tenantId: user.tenant_id || user.tenantId || tenantId,
      permissions: user.permissions || user.page_access || [],
      created_at: user.date_joined || user.created_at || new Date().toISOString(),
      last_login: user.last_login || new Date().toISOString(),
      mfa_enabled: user.mfa_enabled || false,
      invite_status: user.invite_status || 'accepted'
    }));
    
  } catch (error) {
    logger.error('[UserManagement] Error fetching local users:', error);
    
    // Return at least the current user on error
    if (currentUser && currentUser.tenantId === tenantId) {
      return [{
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name || currentUser.email,
        role: currentUser.role || 'OWNER',
        status: 'active',
        tenantId: tenantId,
        permissions: currentUser.permissions || [],
        created_at: currentUser.created_at || new Date().toISOString(),
        last_login: new Date().toISOString(),
        mfa_enabled: currentUser.mfa_enabled || false,
        invite_status: 'accepted'
      }];
    }
    return [];
  }
}

/**
 * Helper function to fetch Auth0 users for tenant
 */
async function fetchAuth0UsersForTenant(tenantId) {
  try {
    // This should call Auth0 Management API
    // Filter users by tenant metadata
    const auth0Config = {
      domain: process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', '').replace('/', '') || process.env.AUTH0_DOMAIN || 'auth.dottapps.com',
      clientId: process.env.AUTH0_CLIENT_ID || '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF',
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      audience: process.env.AUTH0_AUDIENCE || 'https://api.dottapps.com'
    };
    
    if (!auth0Config.domain || !auth0Config.clientId || !auth0Config.clientSecret) {
      logger.warn('[UserManagement] Auth0 config incomplete, skipping Auth0 user fetch');
      return [];
    }
    
    // Get Auth0 Management API token
    const tokenResponse = await fetch(`https://${auth0Config.domain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: auth0Config.clientId,
        client_secret: auth0Config.clientSecret,
        audience: `https://${auth0Config.domain}/api/v2/`,
        grant_type: 'client_credentials'
      })
    });
    
    if (!tokenResponse.ok) {
      throw new Error('Failed to get Auth0 token');
    }
    
    const { access_token } = await tokenResponse.json();
    
    // Fetch users with tenant metadata
    const usersResponse = await fetch(`https://${auth0Config.domain}/api/v2/users?q=app_metadata.tenantId:"${tenantId}"`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!usersResponse.ok) {
      throw new Error('Failed to fetch Auth0 users');
    }
    
    const auth0Users = await usersResponse.json();
    
    return auth0Users.map(user => ({
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
    }));
    
  } catch (error) {
    logger.error('[UserManagement] Error fetching Auth0 users:', error);
    return [];
  }
}

/**
 * Helper function to merge local and Auth0 user data
 */
function mergeUserData(localUsers, auth0Users) {
  const userMap = new Map();
  
  // Add local users
  localUsers.forEach(user => {
    userMap.set(user.email, {
      ...user,
      source: 'local'
    });
  });
  
  // Merge with Auth0 users
  auth0Users.forEach(auth0User => {
    const existing = userMap.get(auth0User.email);
    if (existing) {
      // Merge data, prioritizing more recent information
      userMap.set(auth0User.email, {
        ...existing,
        ...auth0User,
        source: 'merged',
        auth0_id: auth0User.auth0_id,
        last_login: auth0User.last_login || existing.last_login,
        mfa_enabled: auth0User.mfa_enabled || existing.mfa_enabled
      });
    } else {
      userMap.set(auth0User.email, {
        ...auth0User,
        source: 'auth0'
      });
    }
  });
  
  return Array.from(userMap.values()).sort((a, b) => {
    // Sort by role (OWNER first, then ADMIN, then USER)
    const roleOrder = { 'OWNER': 0, 'ADMIN': 1, 'USER': 2 };
    const aOrder = roleOrder[a.role] || 3;
    const bOrder = roleOrder[b.role] || 3;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // Then sort by creation date
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

/**
 * Helper function to check user permissions
 */
function hasPermission(user, permission) {
  // Check if user has the required permission
  if (user.role === 'OWNER') return true;
  if (user.role === 'ADMIN' && permission === 'manage_users') return true;
  
  return user.permissions && user.permissions.includes(permission);
}

/**
 * Helper function to create a new user
 */
async function createUser(userData) {
  // This should create user in both Auth0 and local database
  // For now, return a mock user
  return {
    id: `user-${Date.now()}`,
    email: userData.email,
    name: userData.name || userData.email,
    role: userData.role || 'USER',
    status: 'pending',
    tenantId: userData.tenantId,
    permissions: userData.permissions || [],
    created_at: new Date().toISOString(),
    invite_status: 'sent'
  };
}