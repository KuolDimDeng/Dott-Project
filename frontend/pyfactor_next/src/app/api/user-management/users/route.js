/**
 * User Management API - Main Users Endpoint
 * Handles application users (not HR employees)
 * Integrates with Auth0 and local user records
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

/**
 * GET /api/user-management/users
 * Fetch all users for the current tenant
 */
export async function GET(request) {
  try {
    logger.info('[UserManagement] ========== GET USERS REQUEST START ==========');
    logger.info('[UserManagement] API Route called successfully');
    logger.info('[UserManagement] Request URL:', request.url);
    logger.info('[UserManagement] Request method:', request.method);
    
    // Use Next.js cookies API to access cookies properly
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    logger.info('[UserManagement] All cookies from cookieStore:', allCookies.map(c => ({ name: c.name, valueLength: c.value.length })));
    
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    
    logger.info('[UserManagement] sid cookie found:', !!sidCookie);
    logger.info('[UserManagement] session_token cookie found:', !!sessionTokenCookie);
    
    if (sidCookie) {
      logger.info('[UserManagement] sid cookie value (first 8 chars):', sidCookie.value.substring(0, 8));
    }
    if (sessionTokenCookie) {
      logger.info('[UserManagement] session_token cookie value (first 8 chars):', sessionTokenCookie.value.substring(0, 8));
    }
    
    // First, let's try to make a direct call to the backend with the session cookie
    const sessionCookie = sidCookie || sessionTokenCookie;
    if (!sessionCookie) {
      logger.error('[UserManagement] No session cookie found');
      return NextResponse.json(
        { error: 'No session cookie found' },
        { status: 401 }
      );
    }
    
    logger.info('[UserManagement] Using session cookie:', sessionCookie.name, 'with value:', sessionCookie.value.substring(0, 8) + '...');
    
    // Try direct backend call first
    const backendUrl = process.env.BACKEND_URL || 'https://dott-api-y26w.onrender.com';
    const testUrl = `${backendUrl}/auth/rbac/users/`;
    
    logger.info('[UserManagement] Making direct backend call to:', testUrl);
    
    // Build cookie header
    const cookieHeader = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    const testHeaders = {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader,
      'Authorization': `Session ${sessionCookie.value}`,
      'Accept': 'application/json'
    };
    
    logger.info('[UserManagement] Test request headers:', {
      ...testHeaders,
      'Cookie': 'HIDDEN',
      'Authorization': testHeaders.Authorization.substring(0, 20) + '...'
    });
    
    try {
      const testResponse = await fetch(testUrl, {
        method: 'GET',
        headers: testHeaders,
        cache: 'no-store'
      });
      
      logger.info('[UserManagement] Direct backend response status:', testResponse.status);
      logger.info('[UserManagement] Direct backend response headers:', Object.fromEntries(testResponse.headers.entries()));
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        logger.error('[UserManagement] Direct backend error:', errorText);
      } else {
        const data = await testResponse.json();
        logger.info('[UserManagement] Direct backend success! Data:', data);
        
        // If direct call works, return the data
        return NextResponse.json({
          users: data.users || [],
          total: data.total || 0
        });
      }
    } catch (directError) {
      logger.error('[UserManagement] Direct backend call failed:', directError);
    }
    
    // If direct call fails, continue with the original flow
    logger.info('[UserManagement] Falling back to original session flow...');
    
    // Get session and user info from request headers/cookies
    const session = await getSession(request);
    logger.info('[UserManagement] Session result:', session);
    logger.info('[UserManagement] Session has user?', !!session?.user);
    logger.info('[UserManagement] Session user details:', session?.user ? {
      email: session.user.email,
      tenantId: session.user.tenantId || session.user.tenant_id,
      role: session.user.role
    } : 'No user in session');
    
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
    
    // Log before merging
    logger.info('[UserManagement] Local users count:', localUsers.length);
    logger.info('[UserManagement] Auth0 users count:', auth0Users.length);
    logger.info('[UserManagement] Local users:', JSON.stringify(localUsers, null, 2));
    logger.info('[UserManagement] Auth0 users:', JSON.stringify(auth0Users, null, 2));
    
    // Merge and normalize user data
    const mergedUsers = mergeUserData(localUsers, auth0Users);
    
    logger.info(`[UserManagement] Found ${mergedUsers.length} users for tenant ${tenantId}`);
    logger.info('[UserManagement] Merged users:', JSON.stringify(mergedUsers, null, 2));
    
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
    
    // Use Next.js cookies API to properly access httpOnly cookies
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    
    logger.info('[UserManagement] Cookie store sid:', !!sidCookie);
    logger.info('[UserManagement] Cookie store session_token:', !!sessionTokenCookie);
    
    const sessionCookie = sidCookie || sessionTokenCookie;
    
    if (!sessionCookie) {
      logger.warn('[UserManagement] No session cookie found in cookie store');
      
      // Fallback to header check for debugging
      const cookieHeader = request.headers.get('cookie') || '';
      logger.info('[UserManagement] Fallback cookie header:', cookieHeader);
      logger.info('[UserManagement] Header has sid:', cookieHeader.includes('sid='));
      logger.info('[UserManagement] Header has session_token:', cookieHeader.includes('session_token='));
      
      return null;
    }
    
    const sessionId = sessionCookie.value;
    logger.info('[UserManagement] Session cookie found:', sessionCookie.name);
    logger.info('[UserManagement] Session ID value:', sessionId.substring(0, 8) + '...');
    
    // First try to get user info from session-v2 endpoint (internal call)
    logger.info('[UserManagement] Calling session-v2 endpoint...');
    
    // Build cookie header from cookie store
    const allCookies = cookieStore.getAll();
    const cookieHeader = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
    logger.info('[UserManagement] Rebuilt cookie header for session-v2 call');
    
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
    const backendUrl = process.env.BACKEND_URL || 'https://dott-api-y26w.onrender.com';
    logger.info('[UserManagement] Backend URL:', backendUrl);
    logger.info('[UserManagement] Tenant ID:', tenantId);
    logger.info('[UserManagement] Unlinked only:', unlinkedOnly);
    
    // Get cookies properly using Next.js cookies API
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const cookieHeader = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    logger.info('[UserManagement] Cookie header for backend:', cookieHeader);
    logger.info('[UserManagement] Current user:', currentUser);
    
    // Add unlinked parameter if requested  
    const queryParams = unlinkedOnly ? '?unlinked=true' : '';
    // Ensure we have the trailing slash for Django
    const fullUrl = `${backendUrl}/auth/rbac/users/${queryParams}`.replace(/\/+$/, '') + '/';
    logger.info('[UserManagement] Full backend URL:', fullUrl);
    
    // Get session ID from cookie store
    const sessionCookie = cookieStore.get('sid') || cookieStore.get('session_token');
    const extractedSessionId = sessionCookie?.value;
    logger.info('[UserManagement] Extracted session ID for backend:', extractedSessionId ? extractedSessionId.substring(0, 8) + '...' : 'none');
    
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader,
      'X-Tenant-ID': tenantId
    };
    
    if (extractedSessionId) {
      headers['X-Session-ID'] = extractedSessionId;
      // Add Authorization header with Session token for backend authentication
      headers['Authorization'] = `Session ${extractedSessionId}`;
    }
    
    logger.info('[UserManagement] Request headers to backend:', headers);
    logger.info('[UserManagement] Authorization header:', headers.Authorization || 'Not set');
    
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
      logger.error(`[UserManagement] Backend API returned ${response.status}: ${response.statusText}`);
      logger.error('[UserManagement] Backend error response:', errorText);
      logger.error('[UserManagement] Request headers sent:', headers);
      logger.error('[UserManagement] Full URL called:', fullUrl);
      
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
    logger.info('[UserManagement] Backend response data:', JSON.stringify(data, null, 2));
    logger.info('[UserManagement] Data type:', typeof data);
    logger.info('[UserManagement] Is array:', Array.isArray(data));
    logger.info('[UserManagement] Data keys:', Object.keys(data || {}));
    
    // Backend returns { users: [...], total: n }
    let users = [];
    if (Array.isArray(data)) {
      users = data;
    } else if (data && typeof data === 'object') {
      users = data.users || data.results || [];
    }
    
    logger.info('[UserManagement] Extracted users array:', users);
    logger.info('[UserManagement] Number of users from backend:', users.length);
    
    // Transform backend user data to frontend format
    const transformedUsers = users.map(user => ({
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
    
    logger.info('[UserManagement] Transformed users:', transformedUsers);
    return transformedUsers;
    
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
  logger.info('[UserManagement] ========== MERGE USER DATA START ==========');
  logger.info('[UserManagement] Local users to merge:', localUsers.length);
  logger.info('[UserManagement] Auth0 users to merge:', auth0Users.length);
  
  const userMap = new Map();
  
  // Add local users
  localUsers.forEach(user => {
    logger.info('[UserManagement] Adding local user:', user.email);
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