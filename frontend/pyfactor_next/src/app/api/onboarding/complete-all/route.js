import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { decrypt, encrypt } from '@/utils/sessionEncryption';

/**
 * Consolidated Onboarding API - Simplified Auth0-only approach
 * 
 * This single API endpoint handles the complete onboarding flow:
 * 1. Business information collection
 * 2. Subscription plan selection  
 * 3. User profile completion
 * 4. Tenant creation and assignment
 * 
 * Benefits of this approach:
 * - Single source of truth for onboarding logic
 * - Direct database operations with Auth0 metadata
 * - Simplified error handling and rollback
 * - Faster user experience (one API call)
 * - Easier to maintain and debug
 */

/**
 * Validate Auth0 session
 */
async function validateAuth0Session(request) {
  try {
    // First try to get session from cookie - try new name first, then old
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    if (sessionCookie) {
      let sessionData;
      try {
        // Try to decrypt first (new format)
        try {
          const decrypted = decrypt(sessionCookie.value);
          sessionData = JSON.parse(decrypted);
        } catch (decryptError) {
          // Fallback to old base64 format for backward compatibility
          console.warn('[CompleteOnboarding] Using legacy base64 format');
          sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
        }
        
        // Check if session is expired
        if (sessionData.accessTokenExpiresAt && Date.now() > sessionData.accessTokenExpiresAt) {
          return { isAuthenticated: false, error: 'Session expired', user: null };
        }
        
        if (sessionData.user) {
          return { isAuthenticated: true, user: sessionData.user, sessionData, error: null };
        }
      } catch (error) {
        console.error('[CompleteOnboarding] Error parsing session cookie:', error);
      }
    }
    
    // If no cookie, check Authorization header (from localStorage)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('[CompleteOnboarding] Using authorization header for authentication');
      
      try {
        // Decode JWT to get user info
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          
          // Check if token is expired
          if (payload.exp && Date.now() / 1000 > payload.exp) {
            return { isAuthenticated: false, error: 'Token expired', user: null };
          }
          
          const user = {
            email: payload.email,
            sub: payload.sub,
            name: payload.name || payload.email,
            ...payload // Include all payload data
          };
          
          const sessionData = {
            user,
            accessToken: token,
            accessTokenExpiresAt: payload.exp ? payload.exp * 1000 : Date.now() + 86400000 // 24 hours
          };
          
          return { isAuthenticated: true, user, sessionData, error: null };
        }
      } catch (error) {
        console.error('[CompleteOnboarding] Error decoding token:', error);
      }
    }
    
    return { isAuthenticated: false, error: 'No Auth0 session found', user: null };
  } catch (error) {
    console.error('[CompleteOnboarding] Session validation error:', error);
    return { isAuthenticated: false, error: 'Session validation failed', user: null };
  }
}

/**
 * Update Auth0 session with completed onboarding data
 */
async function updateAuth0Session(sessionData, onboardingData, tenantId) {
  try {
    const updatedSession = {
      ...sessionData,
      user: {
        ...sessionData.user,
        // Mark onboarding as complete with all possible variations
        needsOnboarding: false,
        onboardingCompleted: true,
        onboarding_completed: true,
        needs_onboarding: false,
        currentStep: 'completed',
        current_onboarding_step: 'completed',
        onboardingStatus: 'completed',
        isOnboarded: true,
        setupComplete: true,
        setup_complete: true,
        
        // Store tenant information
        tenant_id: tenantId,
        tenantId: tenantId,
        
        // Store business information in user metadata
        businessName: onboardingData.businessName,
        businessType: onboardingData.businessType,
        // Store subscription plan in all possible field names for compatibility
        subscriptionPlan: onboardingData.selectedPlan,
        subscription_plan: onboardingData.selectedPlan,
        subscriptionType: onboardingData.selectedPlan,
        subscription_type: onboardingData.selectedPlan,
        selected_plan: onboardingData.selectedPlan,
        selectedPlan: onboardingData.selectedPlan,
        
        // Assign owner role to the person completing onboarding
        role: 'owner',
        userRole: 'owner',
        
        // Timestamps
        onboardingCompletedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
    };
    
    const cookieStore = await cookies();
    // Use encryption instead of base64
    const updatedCookie = encrypt(JSON.stringify(updatedSession));
    
    // Set the session cookie with updated data
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      // Add domain for production to ensure cookie works across subdomains
      domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
    };
    
    return { updatedCookie, cookieOptions, success: true };
  } catch (error) {
    console.error('[CompleteOnboarding] Session update error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create tenant in backend database
 */
async function createTenantInBackend(user, onboardingData, tenantId, accessToken) {
  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    console.log('[CompleteOnboarding] Using backend URL:', apiBaseUrl);
    
    const tenantData = {
      tenant_id: tenantId,
      user_email: user.email,
      auth0_sub: user.sub,
      business_name: onboardingData.businessName,
      business_type: onboardingData.businessType,
      business_country: onboardingData.country,
      business_state: onboardingData.businessState,
      legal_structure: onboardingData.legalStructure,
      selected_plan: onboardingData.selectedPlan,
      subscription_plan: onboardingData.selectedPlan,
      billing_cycle: onboardingData.billingCycle,
      owner_first_name: onboardingData.firstName,
      owner_last_name: onboardingData.lastName,
      phone_number: onboardingData.phoneNumber,
      address: onboardingData.address,
      role: 'owner', // Assign owner role
      onboarding_completed: true,
      needs_onboarding: false,
      current_onboarding_step: 'completed',
      setup_complete: true,
      onboarding_completed_at: new Date().toISOString()
    };
    
    console.log('[CompleteOnboarding] Creating tenant in backend:', { tenantId, businessName: onboardingData.businessName });
    
    const response = await fetch(`${apiBaseUrl}/api/onboarding/complete/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-User-Email': user.email,
        'X-User-Sub': user.sub,
        'X-Request-ID': `complete-onboarding-${Date.now()}`,
        'X-Source': 'nextjs-consolidated-api'
      },
      body: JSON.stringify(tenantData),
      timeout: 15000 // 15 second timeout
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('[CompleteOnboarding] Backend tenant creation successful:', result);
      return { success: true, data: result };
    } else {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[CompleteOnboarding] Backend tenant creation failed:', {
        status: response.status,
        error: errorText
      });
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('[CompleteOnboarding] Backend communication error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Main consolidated onboarding endpoint
 */
export async function POST(request) {
  console.log('[CompleteOnboarding] Starting consolidated onboarding process');
  
  try {
    // 1. Validate Auth0 session
    const authResult = await validateAuth0Session(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        message: authResult.error
      }, { status: 401 });
    }
    
    const { user, sessionData } = authResult;
    console.log('[CompleteOnboarding] Authenticated user:', user.email);
    
    // 2. Parse and validate onboarding data
    let onboardingData;
    try {
      onboardingData = await request.json();
      console.log('[CompleteOnboarding] Received onboarding data:', {
        hasBusinessName: !!onboardingData.businessName,
        hasSelectedPlan: !!onboardingData.selectedPlan,
        fields: Object.keys(onboardingData)
      });
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        message: 'Please check your input and try again'
      }, { status: 400 });
    }
    
    // 3. Validate required fields
    const requiredFields = ['businessName', 'businessType', 'selectedPlan'];
    const missingFields = requiredFields.filter(field => !onboardingData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        missingFields,
        message: 'Please complete all required information'
      }, { status: 400 });
    }
    
    // 4. Get existing tenant ID from backend FIRST
    let tenantId = null;
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    // Always try to get tenant ID from backend first
    if (sessionData.accessToken) {
      try {
        console.log('[CompleteOnboarding] Fetching user data from backend to get tenant ID');
        const userResponse = await fetch(`${apiBaseUrl}/api/users/me/`, {
          headers: {
            'Authorization': `Bearer ${sessionData.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          tenantId = userData.tenant_id || userData.tenantId;
          console.log('[CompleteOnboarding] Got tenant ID from backend:', tenantId);
        }
      } catch (error) {
        console.warn('[CompleteOnboarding] Failed to fetch user tenant ID:', error);
      }
    }
    
    // If no backend tenant ID, check other sources
    if (!tenantId) {
      tenantId = user.tenant_id || user.tenantId || onboardingData.tenantId;
    }
    
    // Only generate new tenant ID if absolutely necessary
    if (!tenantId) {
      console.warn('[CompleteOnboarding] No existing tenant ID found, generating new one');
      tenantId = uuidv4();
    }
    
    console.log('[CompleteOnboarding] Using tenant ID:', tenantId);
    
    // 5. Create tenant in backend (attempt with graceful fallback)
    let backendResult = { success: false };
    if (sessionData.accessToken) {
      backendResult = await createTenantInBackend(user, onboardingData, tenantId, sessionData.accessToken);
      if (!backendResult.success) {
        console.warn('[CompleteOnboarding] Backend tenant creation failed, but continuing with onboarding completion');
      }
    } else {
      console.warn('[CompleteOnboarding] No access token available, skipping backend creation');
    }
    
    // 6. Update Auth0 session with completed onboarding - ALWAYS do this even if backend fails
    const sessionUpdateResult = await updateAuth0Session(sessionData, onboardingData, tenantId);
    
    if (!sessionUpdateResult.success) {
      console.error('[CompleteOnboarding] Session update failed:', sessionUpdateResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update session',
        message: 'Please try again or contact support'
      }, { status: 500 });
    }
    
    // 7. Prepare success response
    const responseData = {
      success: true,
      message: 'Onboarding completed successfully!',
      tenant_id: tenantId,
      tenantId: tenantId,
      redirect_url: `/tenant/${tenantId}/dashboard`,
      user: {
        email: user.email,
        businessName: onboardingData.businessName,
        subscriptionPlan: onboardingData.selectedPlan,
        onboardingCompleted: true,
        needsOnboarding: false
      },
      backend: {
        success: backendResult.success,
        message: backendResult.success ? 'Tenant created in backend' : 'Backend unavailable, data saved locally'
      },
      nextSteps: onboardingData.selectedPlan === 'free' 
        ? ['Access your dashboard', 'Explore features', 'Invite team members']
        : ['Complete payment setup', 'Access premium features', 'Contact support if needed']
    };
    
    // 8. Create response with updated session cookie
    const response = NextResponse.json(responseData);
    
    console.log('[CompleteOnboarding] Setting updated session cookie with onboarding complete status');
    console.log('[CompleteOnboarding] Cookie size:', sessionUpdateResult.updatedCookie.length, 'bytes');
    response.cookies.set('dott_auth_session', sessionUpdateResult.updatedCookie, sessionUpdateResult.cookieOptions);
    
    // Set additional cookies for compatibility
    response.cookies.set('onboardingCompleted', 'true', {
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: false,
      sameSite: 'lax'
    });
    
    response.cookies.set('user_tenant_id', tenantId, {
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      sameSite: 'lax'
    });
    
    console.log('[CompleteOnboarding] Onboarding completed successfully for:', {
      email: user.email,
      tenantId,
      businessName: onboardingData.businessName,
      plan: onboardingData.selectedPlan,
      backendSuccess: backendResult.success
    });
    
    // Update backend user record with onboarding completion if we have access token
    if (sessionData.accessToken) {
      try {
        const backendUpdateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/update-onboarding-status/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.accessToken}`
          },
          body: JSON.stringify({
            user_id: user.sub,
            tenant_id: tenantId,
            onboarding_completed: true,
            needs_onboarding: false,
            current_step: 'completed'
          })
        });
        
        if (backendUpdateResponse.ok) {
          console.log('[CompleteOnboarding] Successfully updated backend user onboarding status');
        }
      } catch (error) {
        console.error('[CompleteOnboarding] Failed to update backend user status:', error);
      }
    }
    
    // Remove internal API calls that cause SSL errors
    // The session is already updated above with updateAuth0Session
    console.log('[CompleteOnboarding] Session updated via cookie, skipping internal API calls to avoid SSL errors');
    
    return response;
    
  } catch (error) {
    console.error('[CompleteOnboarding] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check onboarding status
 */
export async function GET(request) {
  try {
    const authResult = await validateAuth0Session(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({
        onboardingCompleted: false,
        needsOnboarding: true,
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    const { user } = authResult;
    
    return NextResponse.json({
      onboardingCompleted: user.onboardingCompleted || false,
      needsOnboarding: user.needsOnboarding !== false,
      currentStep: user.currentStep || 'business_info',
      tenant_id: user.tenant_id || user.tenantId,
      businessName: user.businessName,
      subscriptionPlan: user.subscriptionPlan
    });
  } catch (error) {
    console.error('[CompleteOnboarding] GET error:', error);
    return NextResponse.json({
      onboardingCompleted: false,
      needsOnboarding: true,
      error: 'Failed to check onboarding status'
    }, { status: 500 });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}