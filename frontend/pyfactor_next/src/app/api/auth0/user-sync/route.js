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
            console.error('[UserSync] CRITICAL: Tenant ownership verification failed!', {
              email,
              auth0_sub,
              tenant_id: existingUser.tenant_id,
              status: tenantCheckResponse.status
            });
            
            // DO NOT generate new tenant ID - this causes data loss!
            // Instead, return error requiring support intervention
            const supportCode = `TVF-${Date.now()}-${auth0_sub.slice(-6)}`;
            
            return NextResponse.json({
              success: false,
              error: 'TENANT_VERIFICATION_FAILED',
              message: 'Account verification required. Please contact support.',
              support_code: supportCode,
              support_email: 'support@dottapps.com',
              details: {
                reason: 'Tenant ownership could not be verified',
                action_required: 'Contact support with the provided code'
              }
            }, { status: 403 });
          }
        }
        
        return NextResponse.json({
          success: true,
          is_existing_user: true,
          ...existingUser
        });
      }
      
      // Step 2: User doesn't exist - create new user WITHOUT tenant ID
      console.log('[UserSync] Creating new user without tenant ID - backend will assign during onboarding');
      
      // Add idempotency key to prevent duplicate user creation
      const idempotencyKey = `user-create-${auth0_sub}`;
      
      const createUserResponse = await fetch(`${apiBaseUrl}/api/auth0/create-user/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId || 'no-session-id',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          auth0_sub,
          email,
          name,
          picture,
          email_verified,
          tenant_id: null, // Backend assigns this during onboarding
          role: 'owner',
          needs_onboarding: true,
          created_at: new Date().toISOString()
        })
      });
      
      if (!createUserResponse.ok) {
        const errorText = await createUserResponse.text();
        console.error('[UserSync] Failed to create user:', errorText);
        
        // If it's a conflict (409), user was created by another request
        if (createUserResponse.status === 409) {
          console.log('[UserSync] User creation conflict, retrying fetch...');
          // Retry fetching the user
          const retryResponse = await fetch(`${apiBaseUrl}/api/users/by-auth0-sub/${auth0_sub}/`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (retryResponse.ok) {
            const existingUser = await retryResponse.json();
            return NextResponse.json({
              success: true,
              is_existing_user: true,
              ...existingUser
            });
          }
        }
        
        throw new Error(`Failed to create user: ${createUserResponse.status}`);
      }
      
      const newUser = await createUserResponse.json();
      
      // Check if this is truly a new user creation
      const isNewUser = newUser.isExistingUser === false || newUser.is_new_user === true;
      
      console.log('[UserSync] Backend response:', {
        email: newUser.email,
        tenant_id: newUser.tenant_id || newUser.tenantId,
        needs_onboarding: newUser.needs_onboarding,
        onboardingComplete: newUser.onboardingComplete,
        isExistingUser: newUser.isExistingUser
      });
      
      // If backend explicitly indicates onboarding is complete, respect that
      if (newUser.onboardingComplete === true || newUser.onboarding_completed === true) {
        console.log('[UserSync] Backend indicates onboarding is complete');
        return NextResponse.json({
          success: true,
          is_existing_user: newUser.isExistingUser || true,
          ...newUser,
          tenant_id: newUser.tenant_id || newUser.tenantId,
          needs_onboarding: false,
          onboarding_completed: true
        });
      }
      
      // For new users, respect what backend returns
      return NextResponse.json({
        success: true,
        is_existing_user: newUser.isExistingUser || false,
        ...newUser,
        // Use backend-provided values if available
        tenant_id: newUser.tenant_id || newUser.tenantId || null,
        // CRITICAL: For new users, always set needs_onboarding to true unless backend explicitly says otherwise
        needs_onboarding: isNewUser ? true : (newUser.needs_onboarding !== false),
        onboarding_completed: isNewUser ? false : (newUser.onboardingComplete || false)
      });
      
    } catch (backendError) {
      console.error('[UserSync] Backend error:', backendError);
      
      // Fallback: Create user data locally if backend is unavailable
      return NextResponse.json({
        success: true,
        is_existing_user: false,
        user_id: null,
        auth0_sub,
        email,
        name,
        tenant_id: null, // No tenant ID until onboarding
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