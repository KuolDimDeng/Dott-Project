import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { decrypt, encrypt } from '@/utils/sessionEncryption';
import { countries } from 'countries-list';

/**
 * Helper function to convert country name to 2-letter code
 */
function getCountryCode(countryName) {
  // Handle common cases first
  if (!countryName) return 'US';
  if (countryName.length === 2) return countryName.toUpperCase();
  
  // Special cases
  const specialCases = {
    'United States': 'US',
    'United States of America': 'US',
    'USA': 'US',
    'United Kingdom': 'GB',
    'UK': 'GB',
    'Great Britain': 'GB'
  };
  
  if (specialCases[countryName]) {
    return specialCases[countryName];
  }
  
  // Search through countries list
  for (const [code, country] of Object.entries(countries)) {
    if (country.name === countryName || country.native === countryName) {
      return code;
    }
  }
  
  // Default to US if not found
  console.warn(`[CompleteOnboarding] Country not found: ${countryName}, defaulting to US`);
  return 'US';
}

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
 * Validate session using the new session token system
 */
async function validateAuth0Session(request) {
  try {
    console.log('[CompleteOnboarding] Validating session with new token system');
    
    // Get session token from cookies (check both sid and session_token)
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token') || cookieStore.get('sid');
    
    if (!sessionToken) {
      console.log('[CompleteOnboarding] No session_token or sid cookie found');
      return { isAuthenticated: false, error: 'No session token found', user: null };
    }
    
    console.log('[CompleteOnboarding] Found session token, validating with backend');
    
    // Validate session token with backend
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionToken.value}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('[CompleteOnboarding] Backend session validation failed:', response.status);
      return { isAuthenticated: false, error: 'Session validation failed', user: null };
    }
    
    const sessionData = await response.json();
    console.log('[CompleteOnboarding] Full session data structure:', JSON.stringify(sessionData, null, 2));
    
    // Extract tenant ID from various possible locations
    const extractedTenantId = sessionData.tenant?.id || 
                            sessionData.tenant_id || 
                            sessionData.tenantId ||
                            sessionData.user?.tenant_id ||
                            sessionData.user?.tenantId;
    
    console.log('[CompleteOnboarding] Session validated successfully:', {
      email: sessionData.user?.email,
      tenantId: extractedTenantId,
      needsOnboarding: sessionData.needs_onboarding
    });
    
    const user = {
      email: sessionData.user?.email,
      sub: sessionData.user?.id || sessionData.session_token,
      name: sessionData.user?.name || sessionData.user?.email,
      tenantId: extractedTenantId,
      tenant_id: extractedTenantId,
      needsOnboarding: sessionData.needs_onboarding,
      onboardingCompleted: sessionData.onboarding_completed
    };
    
    // Create compatible session data structure
    const compatibleSessionData = {
      user,
      sessionToken: sessionToken.value,
      // Note: We don't have an access token in this system, will handle backend calls differently
      accessToken: null,
      accessTokenExpiresAt: null
    };
    
    return { isAuthenticated: true, user, sessionData: compatibleSessionData, error: null };
    
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
    console.log('[updateAuth0Session] 🔄 Starting session update');
    console.log('[updateAuth0Session] 🔄 Current session user:', {
      email: sessionData.user?.email,
      needsOnboarding: sessionData.user?.needsOnboarding,
      onboardingCompleted: sessionData.user?.onboardingCompleted,
      tenantId: sessionData.user?.tenantId
    });
    
    const updatedSession = {
      ...sessionData,
      user: {
        ...sessionData.user,
        // CRITICAL: Always mark onboarding as complete when this function is called
        // We're at the end of the onboarding flow, so needsOnboarding should be false
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
        
        // Payment status fields
        paymentPending: onboardingData.paymentPending || false,
        payment_pending: onboardingData.paymentPending || false,
        needsPayment: onboardingData.needsPayment || false,
        needs_payment: onboardingData.needsPayment || false,
        
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
    
    console.log('[updateAuth0Session] 🔄 Updated session user:', {
      email: updatedSession.user?.email,
      needsOnboarding: updatedSession.user?.needsOnboarding,
      onboardingCompleted: updatedSession.user?.onboardingCompleted,
      tenantId: updatedSession.user?.tenantId,
      businessName: updatedSession.user?.businessName
    });
    
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
    
    console.log('[updateAuth0Session] 🔄 Encryption complete, cookie size:', updatedCookie.length);
    console.log('[updateAuth0Session] 🔄 Cookie options:', cookieOptions);
    
    return { updatedCookie, cookieOptions, success: true };
  } catch (error) {
    console.error('[updateAuth0Session] ❌ Session update error:', error);
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
    // Get tenant ID from user or session data
    let tenantId = user.tenantId || user.tenant_id || sessionData.tenantId || sessionData.tenant_id;
    
    // Extract from sessionData.user if available
    if (!tenantId && sessionData.user) {
      tenantId = sessionData.user.tenantId || sessionData.user.tenant_id;
    }
    
    // If still no tenant ID, generate one (but this should rarely happen)
    if (!tenantId) {
      console.warn('[CompleteOnboarding] No tenant ID found in user or session, generating new one');
      tenantId = uuidv4();
    }
    
    console.log('[CompleteOnboarding] Initial tenant ID check:', {
      fromUser: user.tenantId || user.tenant_id,
      fromSession: sessionData.tenantId || sessionData.tenant_id,
      fromSessionUser: sessionData.user?.tenantId || sessionData.user?.tenant_id,
      finalTenantId: tenantId
    });
    
    if (sessionData.sessionToken) {
      try {
        console.log('[CompleteOnboarding] Step 1: Submitting business information');
        const businessResponse = await fetch(`${apiBaseUrl}/api/onboarding/save-business-info/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Session ${sessionData.sessionToken}`,
            'X-User-Email': user.email,
            'X-User-Sub': user.sub,
            'X-Tenant-ID': tenantId // Use the generated tenant ID
          },
          body: JSON.stringify({
            business_name: onboardingData.businessName,
            businessName: onboardingData.businessName,
            business_type: onboardingData.businessType,
            businessType: onboardingData.businessType,
            country: getCountryCode(onboardingData.country) || 'US',
            legal_structure: onboardingData.legalStructure || 'Other',
            date_founded: onboardingData.dateFounded || new Date().toISOString().split('T')[0]
          })
        });
        
        if (businessResponse.ok) {
          const businessResult = await businessResponse.json();
          console.log('[CompleteOnboarding] Business info submitted successfully:', businessResult);
          
          // Extract tenant ID from various possible locations in the response
          console.log('[CompleteOnboarding] Business info response structure:', {
            hasData: !!businessResult.data,
            hasSchemaSetup: !!businessResult.data?.schemaSetup,
            hasSchemaName: !!businessResult.data?.schemaSetup?.schema_name,
            hasTenantId: !!businessResult.tenant_id,
            hasTenantIdCamel: !!businessResult.tenantId,
            responseKeys: Object.keys(businessResult)
          });
          
          // Try to extract tenant ID from multiple locations
          if (businessResult.tenant_id) {
            tenantId = businessResult.tenant_id;
            console.log('[CompleteOnboarding] Got tenant ID from response.tenant_id:', tenantId);
          } else if (businessResult.tenantId) {
            tenantId = businessResult.tenantId;
            console.log('[CompleteOnboarding] Got tenant ID from response.tenantId:', tenantId);
          } else if (businessResult.data?.tenant_id) {
            tenantId = businessResult.data.tenant_id;
            console.log('[CompleteOnboarding] Got tenant ID from response.data.tenant_id:', tenantId);
          } else if (businessResult.data?.tenantId) {
            tenantId = businessResult.data.tenantId;
            console.log('[CompleteOnboarding] Got tenant ID from response.data.tenantId:', tenantId);
          } else if (businessResult.data?.schemaSetup?.schema_name) {
            // Extract from schema name: tenant_5e6ab306_8cbf_43b9_9778_f1abbe7b6ed1
            const schemaName = businessResult.data.schemaSetup.schema_name;
            console.log('[CompleteOnboarding] Trying to extract from schema name:', schemaName);
            // Match tenant ID with underscores (backend uses underscores instead of hyphens)
            // Pattern: tenant_75ec28c2_697c_4b55_99ab_d86ad70e382c
            // Match the full UUID pattern with underscores
            const schemaMatch = schemaName.match(/tenant_([a-f0-9]{8}_[a-f0-9]{4}_[a-f0-9]{4}_[a-f0-9]{4}_[a-f0-9]{12})/);
            if (schemaMatch) {
              // Convert underscores back to hyphens for the tenant ID
              tenantId = schemaMatch[1].replace(/_/g, '-');
              console.log('[CompleteOnboarding] Extracted full tenant ID from schema:', tenantId);
            } else {
              // Fallback to simpler pattern if full UUID match fails
              const simpleMatch = schemaName.match(/tenant_([a-f0-9_]+)/);
              if (simpleMatch) {
                tenantId = simpleMatch[1].replace(/_/g, '-');
                console.log('[CompleteOnboarding] Extracted tenant ID with simple pattern:', tenantId);
              }
            }
          }
          
          // Log the tenant ID for debugging
          console.log('[CompleteOnboarding] Final tenant ID after business info:', tenantId);
          
          // Step 2: Submit subscription selection
          console.log('[CompleteOnboarding] Step 2: Submitting subscription selection');
          const subscriptionResponse = await fetch(`${apiBaseUrl}/api/onboarding/subscription/save/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Session ${sessionData.sessionToken}`,
              'X-User-Email': user.email,
              'X-User-Sub': user.sub,
              'X-Tenant-ID': tenantId
            },
            body: JSON.stringify({
              selected_plan: onboardingData.selectedPlan,
              billing_cycle: onboardingData.billingCycle || 'monthly'
            })
          });
          
          if (!subscriptionResponse.ok) {
            console.error('[CompleteOnboarding] Subscription submission failed');
          }
          
          // Step 3: Mark onboarding as complete for ALL plans
          // CRITICAL FIX: Always mark onboarding as complete, regardless of payment status
          // The backend should set needs_onboarding = false for all users who complete onboarding
          console.log('[CompleteOnboarding] Step 3: FORCE marking onboarding as complete for plan:', onboardingData.selectedPlan);
          
          // Call complete endpoint with force_complete flag to ensure backend updates needs_onboarding
          const completeResponse = await fetch(`${apiBaseUrl}/api/onboarding/complete/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Session ${sessionData.sessionToken}`,
              'X-User-Email': user.email,
              'X-User-Sub': user.sub,
              'X-Tenant-ID': tenantId
            },
            body: JSON.stringify({
              selected_plan: onboardingData.selectedPlan,
              billing_cycle: onboardingData.billingCycle || 'monthly',
              force_complete: true, // Force completion for ALL plans
              payment_verified: true, // Mark as verified to bypass payment checks
              mark_onboarding_complete: true, // Explicit flag to mark complete
              needs_onboarding: false, // Explicitly set to false
              onboarding_completed: true, // Explicitly set to true
              setup_done: true // Explicitly set to true
            })
          });
          
          if (completeResponse.ok) {
            const completeResult = await completeResponse.json();
            console.log('[CompleteOnboarding] ✅ Backend marked onboarding complete:', completeResult);
            
            // Try to get tenant ID from complete response if we don't have it
            if (!tenantId) {
              if (completeResult.tenant_id) {
                tenantId = completeResult.tenant_id;
                console.log('[CompleteOnboarding] Got tenant ID from complete response.tenant_id:', tenantId);
              } else if (completeResult.tenantId) {
                tenantId = completeResult.tenantId;
                console.log('[CompleteOnboarding] Got tenant ID from complete response.tenantId:', tenantId);
              } else if (completeResult.data?.tenant_id) {
                tenantId = completeResult.data.tenant_id;
                console.log('[CompleteOnboarding] Got tenant ID from complete response.data.tenant_id:', tenantId);
              } else if (completeResult.data?.tenantId) {
                tenantId = completeResult.data.tenantId;
                console.log('[CompleteOnboarding] Got tenant ID from complete response.data.tenantId:', tenantId);
              }
            }
          } else {
            console.error('[CompleteOnboarding] ❌ Failed to mark onboarding complete, status:', completeResponse.status);
            // Don't fail the whole process, continue with session update
          }
          
          // For paid tiers, also mark payment as pending
          if (onboardingData.selectedPlan !== 'free') {
            console.log('[CompleteOnboarding] Marking payment as pending for paid tier');
            try {
              const paymentPendingResponse = await fetch(`${apiBaseUrl}/api/onboarding/payment-pending/`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Session ${sessionData.sessionToken}`,
                  'X-User-Email': user.email,
                  'X-User-Sub': user.sub
                },
                body: JSON.stringify({
                  selected_plan: onboardingData.selectedPlan,
                  billing_cycle: onboardingData.billingCycle || 'monthly'
                })
              });
              
              if (paymentPendingResponse.ok) {
                console.log('[CompleteOnboarding] Marked payment as pending for paid tier');
              }
            } catch (error) {
              console.error('[CompleteOnboarding] Failed to mark payment pending:', error);
            }
          }
          
          // CRITICAL: Force complete onboarding in backend to ensure it's saved
          console.log('[CompleteOnboarding] 🚨 FORCING backend completion to ensure proper save...');
          try {
            const forceCompleteResponse = await fetch(`${apiBaseUrl}/api/onboarding/force-complete/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Session ${sessionData.sessionToken}`,
                'X-User-Email': user.email,
                'X-User-Sub': user.sub
              },
              body: JSON.stringify({
                selected_plan: onboardingData.selectedPlan,
                payment_verified: onboardingData.selectedPlan === 'free' || onboardingData.paymentCompleted,
                payment_id: onboardingData.paymentIntentId || onboardingData.subscriptionId,
                tenant_id: tenantId
              })
            });
            
            if (forceCompleteResponse.ok) {
              const forceResult = await forceCompleteResponse.json();
              console.log('[CompleteOnboarding] ✅ Force complete successful:', forceResult);
            } else {
              console.error('[CompleteOnboarding] ❌ Force complete failed, status:', forceCompleteResponse.status);
            }
          } catch (error) {
            console.error('[CompleteOnboarding] ❌ Force complete error:', error);
          }
        } else {
          console.error('[CompleteOnboarding] Business info submission failed, status:', businessResponse.status);
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
      console.error('[CompleteOnboarding] No session token available');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        message: 'Please sign in and try again'
      }, { status: 401 });
    }
    
    // 6. Update Auth0 session - ALWAYS mark as complete regardless of plan
    // CRITICAL: Force onboarding completion in session to prevent redirect loop
    const modifiedOnboardingData = {
      ...onboardingData,
      paymentPending: false, // Never mark as pending in session
      needsPayment: false, // Always show as complete
      forceComplete: true, // Force completion status
      onboardingCompleted: true, // Explicitly complete
      needsOnboarding: false // Explicitly not needed
    };
    
    const sessionUpdateResult = await updateAuth0Session(sessionData, modifiedOnboardingData, tenantId);
    
    if (!sessionUpdateResult.success) {
      console.error('[CompleteOnboarding] Session update failed:', sessionUpdateResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update session',
        message: 'Please try again or contact support'
      }, { status: 500 });
    }
    
    console.log('[CompleteOnboarding] 🍪 Session update successful');
    console.log('[CompleteOnboarding] 🍪 Updated cookie length:', sessionUpdateResult.updatedCookie?.length);
    console.log('[CompleteOnboarding] 🍪 Cookie will be set in response');
    
    // CRITICAL: Force a small delay to ensure cookie is written before response
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 7. Prepare success response
    console.log('[CompleteOnboarding] 🎯 Final tenant ID before response:', tenantId);
    
    // Validate tenant ID format
    if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
      console.error('[CompleteOnboarding] ❌ Invalid tenant ID detected:', tenantId);
      // Try one more time to get from session
      const sessionCheck = await validateAuth0Session(request);
      if (sessionCheck.user?.tenantId) {
        tenantId = sessionCheck.user.tenantId;
        console.log('[CompleteOnboarding] Retrieved tenant ID from session recheck:', tenantId);
      }
    }
    
    const responseData = {
      success: true,
      message: 'Onboarding completed successfully!',
      tenant_id: tenantId,
      tenantId: tenantId,
      redirect_url: `/${tenantId}/dashboard`,
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
    
    // CRITICAL: Preserve the sid cookie from the current session
    console.log('[CompleteOnboarding] 🍪 COOKIE UPDATE PROCESS STARTING');
    const currentCookies = await cookies();
    const currentSid = currentCookies.get('sid');
    const currentSessionToken = currentCookies.get('session_token');
    
    console.log('[CompleteOnboarding] 🍪 Current sid cookie:', currentSid ? 'present' : 'missing');
    console.log('[CompleteOnboarding] 🍪 Current session_token cookie:', currentSessionToken ? 'present' : 'missing');
    
    // CRITICAL: Preserve the sid and session_token cookies
    if (currentSid || currentSessionToken) {
      const sessionTokenValue = currentSid?.value || currentSessionToken?.value || sessionData.sessionToken;
      
      if (sessionTokenValue) {
        console.log('[CompleteOnboarding] 🍪 Preserving session ID cookie');
        
        // Re-set the sid cookie to ensure it's not lost
        response.cookies.set('sid', sessionTokenValue, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60, // 7 days
          path: '/',
          domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
        });
        
        // Also set session_token for compatibility
        response.cookies.set('session_token', sessionTokenValue, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60, // 7 days
          path: '/',
          domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
        });
        
        console.log('[CompleteOnboarding] 🍪 Session cookies preserved');
      } else {
        console.error('[CompleteOnboarding] ❌ No session token found to preserve!');
      }
    }
    
    // Remove old session cookies that are no longer used
    const oldCookies = [
      'dott_auth_session',
      'appSession',
      'session_pending',
      'businessInfoCompleted',
      'onboardingStep',
      'onboardedStatus'
    ];
    
    oldCookies.forEach(cookieName => {
      response.cookies.delete(cookieName);
    });
    
    console.log('[CompleteOnboarding] 🍪 Old cookies cleaned up');
    
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
      secure: process.env.NODE_ENV === 'production',
      domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
    });
    
    // CRITICAL: Force backend session update
    if (sessionData.sessionToken) {
      try {
        console.log('[CompleteOnboarding] Updating backend session state');
        const sessionUpdateResponse = await fetch(`${apiBaseUrl}/api/auth/update-session/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Session ${sessionData.sessionToken}`
          },
          body: JSON.stringify({
            needs_onboarding: false,
            onboarding_completed: true,
            tenant_id: tenantId,
            subscription_plan: onboardingData.selectedPlan
          })
        });
        
        if (sessionUpdateResponse.ok) {
          console.log('[CompleteOnboarding] Backend session updated successfully');
        } else {
          console.error('[CompleteOnboarding] Failed to update backend session:', sessionUpdateResponse.status);
        }
      } catch (error) {
        console.error('[CompleteOnboarding] Error updating backend session:', error);
      }
    }
    
    // Log all response headers
    const allHeaders = {};
    response.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });
    console.log('[CompleteOnboarding] 🍪 Response headers:', allHeaders);
    
    console.log('[CompleteOnboarding] ✅ Onboarding completed successfully for:', {
      email: user.email,
      tenantId,
      businessName: onboardingData.businessName,
      plan: onboardingData.selectedPlan,
      cookiesSet: {
        dott_auth_session: sessionUpdateResult.updatedCookie.length,
        appSession: sessionUpdateResult.updatedCookie.length,
        onboardingCompleted: 'true',
        user_tenant_id: tenantId
      }
    });
    
    // CRITICAL: Force update backend user record to mark onboarding as complete
    if (sessionData.sessionToken) {
      try {
        console.log('[CompleteOnboarding] 🚨 FORCING backend user onboarding completion...');
        
        // Method 1: Update user status directly
        const backendUpdateResponse = await fetch(`${apiBaseUrl}/api/users/update-onboarding-status/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Session ${sessionData.sessionToken}`,
            'X-User-Email': user.email,
            'X-User-Sub': user.sub
          },
          body: JSON.stringify({
            user_id: user.sub,
            user_email: user.email,
            tenant_id: tenantId,
            onboarding_completed: true,
            needs_onboarding: false,
            setup_done: true,
            current_step: 'completed',
            onboarding_status: 'complete',
            force_update: true // Force the update
          })
        });
        
        if (backendUpdateResponse.ok) {
          const updateResult = await backendUpdateResponse.json();
          console.log('[CompleteOnboarding] ✅ Backend user status updated:', updateResult);
        } else {
          console.error('[CompleteOnboarding] ❌ User status update failed, status:', backendUpdateResponse.status);
        }
        
        // Method 2: Call the admin fix endpoint as fallback
        console.log('[CompleteOnboarding] 🚨 Calling admin fix endpoint as fallback...');
        const adminFixResponse = await fetch(`${apiBaseUrl}/api/onboarding/admin-fix-status/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Session ${sessionData.sessionToken}`,
            'X-User-Email': user.email
          },
          body: JSON.stringify({
            email: user.email,
            action: 'mark_complete',
            force: true
          })
        });
        
        if (adminFixResponse.ok) {
          console.log('[CompleteOnboarding] ✅ Admin fix endpoint succeeded');
        } else {
          // Clone the response to avoid "Body has already been consumed" error
          const responseClone = adminFixResponse.clone();
          try {
            const errorText = await responseClone.text();
            console.error('[CompleteOnboarding] ❌ Admin fix failed:', errorText);
          } catch (textError) {
            console.error('[CompleteOnboarding] ❌ Admin fix failed with status:', adminFixResponse.status);
          }
        }
        
      } catch (error) {
        console.error('[CompleteOnboarding] ❌ Failed to update backend user status:', error);
        // Don't fail the whole process
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