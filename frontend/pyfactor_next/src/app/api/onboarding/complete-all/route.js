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

// Removed createTenantInBackend function - now using sequential API calls instead

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
    
    // 4. Backend API URL
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    console.log('[CompleteOnboarding] Starting backend onboarding process');
    
    // 5. First, submit business information to create/update tenant with correct name
    let tenantId = null;
    
    if (sessionData.accessToken) {
      try {
        console.log('[CompleteOnboarding] Step 1: Submitting business information');
        const businessResponse = await fetch(`${apiBaseUrl}/api/onboarding/business-info/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.accessToken}`,
            'X-User-Email': user.email,
            'X-User-Sub': user.sub
          },
          body: JSON.stringify({
            business_name: onboardingData.businessName,
            businessName: onboardingData.businessName,
            business_type: onboardingData.businessType,
            businessType: onboardingData.businessType,
            country: onboardingData.country || 'US',
            legal_structure: onboardingData.legalStructure,
            date_founded: onboardingData.dateFounded
          })
        });
        
        if (businessResponse.ok) {
          const businessResult = await businessResponse.json();
          console.log('[CompleteOnboarding] Business info submitted successfully:', businessResult);
          tenantId = businessResult.tenant_id || businessResult.tenantId;
          
          // Step 2: Submit subscription selection
          console.log('[CompleteOnboarding] Step 2: Submitting subscription selection');
          const subscriptionResponse = await fetch(`${apiBaseUrl}/api/onboarding/subscription/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionData.accessToken}`,
              'X-User-Email': user.email,
              'X-User-Sub': user.sub
            },
            body: JSON.stringify({
              selected_plan: onboardingData.selectedPlan,
              billing_cycle: onboardingData.billingCycle || 'monthly'
            })
          });
          
          if (!subscriptionResponse.ok) {
            console.error('[CompleteOnboarding] Subscription submission failed');
          }
          
          // Step 3: Complete onboarding
          console.log('[CompleteOnboarding] Step 3: Marking onboarding as complete');
          const completeResponse = await fetch(`${apiBaseUrl}/api/onboarding/complete/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionData.accessToken}`,
              'X-User-Email': user.email,
              'X-User-Sub': user.sub
            },
            body: JSON.stringify({
              selected_plan: onboardingData.selectedPlan,
              billing_cycle: onboardingData.billingCycle || 'monthly'
            })
          });
          
          if (completeResponse.ok) {
            const completeResult = await completeResponse.json();
            console.log('[CompleteOnboarding] Onboarding marked complete:', completeResult);
            if (!tenantId && completeResult.data) {
              tenantId = completeResult.data.tenantId || completeResult.data.tenant_id;
            }
          }
        } else {
          const errorText = await businessResponse.text();
          console.error('[CompleteOnboarding] Business info submission failed:', errorText);
          return NextResponse.json({
            success: false,
            error: 'Failed to submit business information',
            message: 'Please try again or contact support'
          }, { status: 500 });
        }
      } catch (error) {
        console.error('[CompleteOnboarding] Backend communication error:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to complete onboarding',
          message: error.message
        }, { status: 500 });
      }
    } else {
      console.error('[CompleteOnboarding] No access token available');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        message: 'Please sign in and try again'
      }, { status: 401 });
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
    
    console.log('[CompleteOnboarding] Session update successful, cookie will be set in response');
    
    // CRITICAL: Force a small delay to ensure cookie is written before response
    await new Promise(resolve => setTimeout(resolve, 50));
    
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
        success: true,
        message: 'Onboarding completed successfully'
      },
      nextSteps: onboardingData.selectedPlan === 'free' 
        ? ['Access your dashboard', 'Explore features', 'Invite team members']
        : ['Complete payment setup', 'Access premium features', 'Contact support if needed']
    };
    
    // 8. Create response with updated session cookie
    const response = NextResponse.json(responseData);
    
    // CRITICAL: First delete old cookies to ensure clean state
    console.log('[CompleteOnboarding] Deleting old session cookies to ensure clean update');
    response.cookies.delete('dott_auth_session');
    response.cookies.delete('appSession');
    
    // Small delay to ensure deletion
    await new Promise(resolve => setTimeout(resolve, 10));
    
    console.log('[CompleteOnboarding] Setting updated session cookie with onboarding complete status');
    console.log('[CompleteOnboarding] Cookie size:', sessionUpdateResult.updatedCookie.length, 'bytes');
    
    // Set the new cookies with proper domain for production
    const enhancedCookieOptions = {
      ...sessionUpdateResult.cookieOptions,
      // Ensure domain is set correctly for production
      domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined,
      // Force overwrite with priority
      priority: 'high'
    };
    
    response.cookies.set('dott_auth_session', sessionUpdateResult.updatedCookie, enhancedCookieOptions);
    response.cookies.set('appSession', sessionUpdateResult.updatedCookie, enhancedCookieOptions);
    
    // CRITICAL: Also return the session data in the response so client can update localStorage
    responseData.sessionData = {
      needsOnboarding: false,
      onboardingCompleted: true,
      tenantId: tenantId,
      subscriptionPlan: onboardingData.selectedPlan,
      businessName: onboardingData.businessName
    };
    
    // Set additional cookies for compatibility
    response.cookies.set('onboardingCompleted', 'true', {
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    response.cookies.set('user_tenant_id', tenantId, {
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    // Set a temporary completion marker for immediate verification
    response.cookies.set('onboarding_just_completed', 'true', {
      path: '/',
      maxAge: 60 * 5, // 5 minutes
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    console.log('[CompleteOnboarding] Onboarding completed successfully for:', {
      email: user.email,
      tenantId,
      businessName: onboardingData.businessName,
      plan: onboardingData.selectedPlan
    });
    
    // Update backend user record with onboarding completion if we have access token
    if (sessionData.accessToken && tenantId) {
      try {
        console.log('[CompleteOnboarding] Updating backend user onboarding status...');
        console.log('[CompleteOnboarding] Backend URL:', `${apiBaseUrl}/api/users/update-onboarding-status/`);
        console.log('[CompleteOnboarding] Payload:', {
          user_id: user.sub,
          tenant_id: tenantId,
          onboarding_completed: true,
          needs_onboarding: false,
          current_step: 'completed'
        });
        
        const backendUpdateResponse = await fetch(`${apiBaseUrl}/api/users/update-onboarding-status/`, {
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
        
        console.log('[CompleteOnboarding] Backend update response status:', backendUpdateResponse.status);
        
        if (backendUpdateResponse.ok) {
          const updateResult = await backendUpdateResponse.json();
          console.log('[CompleteOnboarding] Successfully updated backend user onboarding status:', updateResult);
        } else {
          const errorText = await backendUpdateResponse.text();
          console.error('[CompleteOnboarding] Backend update failed:', {
            status: backendUpdateResponse.status,
            error: errorText
          });
        }
      } catch (error) {
        console.error('[CompleteOnboarding] Failed to update backend user status:', error);
      }
    } else {
      console.warn('[CompleteOnboarding] Skipping backend update - no access token or tenant ID');
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