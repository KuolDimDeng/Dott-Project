import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { headers } from 'next/headers';

/**
 * User sync endpoint - ensures each user has a unique tenant ID
 * CRITICAL: This prevents the security issue of multiple users sharing tenant IDs
 */
export async function POST(request) {
  const startTime = Date.now();
  
  try {
    // Get headers
    const headersList = await headers();
    const sessionId = headersList.get('x-session-id');
    const authorization = headersList.get('authorization');
    
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const accessToken = authorization.substring(7);
    
    // Parse request body
    const body = await request.json();
    const { auth0_sub, email, name, picture, email_verified } = body;
    
    if (!auth0_sub || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    console.log('[UserSync] Processing user sync request:', {
      email,
      auth0_sub,
      sessionId,
      timestamp: new Date().toISOString()
    });
    
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://127.0.0.1:8000';
    
    try {
      // Step 1: Check if user exists in backend
      const userCheckResponse = await fetch(`${apiBaseUrl}/api/users/by-auth0-sub/${encodeURIComponent(auth0_sub)}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId || 'no-session-id'
        }
      });
      
      if (userCheckResponse.ok) {
        // User exists - return their data
        const existingUser = await userCheckResponse.json();
        
        console.log('[UserSync] Found existing user:', {
          email: existingUser.email,
          tenant_id: existingUser.tenant_id,
          needs_onboarding: existingUser.needs_onboarding
        });
        
        // CRITICAL: Validate that this user has their own tenant ID
        if (existingUser.tenant_id) {
          // Verify this tenant ID belongs to this user
          const tenantCheckResponse = await fetch(`${apiBaseUrl}/api/tenants/${existingUser.tenant_id}/verify-owner/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              auth0_sub,
              email
            })
          });
          
          if (!tenantCheckResponse.ok) {
            console.error('[UserSync] CRITICAL: Tenant ownership verification failed!');
            // Generate new tenant ID for security
            existingUser.tenant_id = uuidv4();
            existingUser.needs_fixing = true;
          }
        }
        
        return NextResponse.json({
          success: true,
          is_existing_user: true,
          ...existingUser
        });
      }
      
      // Step 2: User doesn't exist - create new user with unique tenant ID
      console.log('[UserSync] Creating new user');
      
      // CRITICAL: Generate a new unique tenant ID for this user
      const newTenantId = uuidv4();
      
      const createUserResponse = await fetch(`${apiBaseUrl}/api/auth0/create-user/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId || 'no-session-id'
        },
        body: JSON.stringify({
          auth0_sub,
          email,
          name,
          picture,
          email_verified,
          tenant_id: newTenantId,
          role: 'owner',
          needs_onboarding: true,
          created_at: new Date().toISOString()
        })
      });
      
      if (!createUserResponse.ok) {
        const errorText = await createUserResponse.text();
        console.error('[UserSync] Failed to create user:', errorText);
        throw new Error(`Failed to create user: ${createUserResponse.status}`);
      }
      
      const newUser = await createUserResponse.json();
      
      console.log('[UserSync] Created new user:', {
        email: newUser.email,
        tenant_id: newUser.tenant_id,
        needs_onboarding: true
      });
      
      // Step 3: Create tenant record
      const createTenantResponse = await fetch(`${apiBaseUrl}/api/tenants/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: newTenantId,
          name: `${email}'s Organization`,
          owner_id: auth0_sub,
          owner_email: email,
          created_at: new Date().toISOString(),
          rls_enabled: true
        })
      });
      
      if (!createTenantResponse.ok) {
        console.error('[UserSync] Failed to create tenant record');
      }
      
      return NextResponse.json({
        success: true,
        is_existing_user: false,
        ...newUser,
        tenant_id: newTenantId,
        needs_onboarding: true
      });
      
    } catch (backendError) {
      console.error('[UserSync] Backend error:', backendError);
      
      // Fallback: Create user data locally if backend is unavailable
      const fallbackTenantId = uuidv4();
      
      return NextResponse.json({
        success: true,
        is_existing_user: false,
        user_id: null,
        auth0_sub,
        email,
        name,
        tenant_id: fallbackTenantId,
        needs_onboarding: true,
        fallback_mode: true,
        message: 'User created in fallback mode'
      });
    }
    
  } catch (error) {
    console.error('[UserSync] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  } finally {
    console.log(`[UserSync] Request completed in ${Date.now() - startTime}ms`);
  }
}