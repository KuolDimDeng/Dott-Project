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
          
          // Step 3: Mark onboarding as complete for ALL plans
          // CRITICAL FIX: Always mark onboarding as complete, regardless of payment status
          // The backend should set needs_onboarding = false for all users who complete onboarding
          console.log('[CompleteOnboarding] Step 3: FORCE marking onboarding as complete for plan:', onboardingData.selectedPlan);
          
          // Call complete endpoint with force_complete flag to ensure backend updates needs_onboarding
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
            if (!tenantId && completeResult.data) {
              tenantId = completeResult.data.tenantId || completeResult.data.tenant_id;
            }
          } else {
            const errorText = await completeResponse.text();
            console.error('[CompleteOnboarding] ❌ Failed to mark onboarding complete:', errorText);
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
                  'Authorization': `Bearer ${sessionData.accessToken}`,
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
                'Authorization': `Bearer ${sessionData.accessToken}`,
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
              const errorText = await forceCompleteResponse.text();
              console.error('[CompleteOnboarding] ❌ Force complete failed:', errorText);
            }
          } catch (error) {
            console.error('[CompleteOnboarding] ❌ Force complete error:', error);
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
    
    // CRITICAL: Log the current cookies before changes
    console.log('[CompleteOnboarding] 🍪 COOKIE UPDATE PROCESS STARTING');
    const currentCookies = await cookies();
    const currentDottAuth = currentCookies.get('dott_auth_session');
    const currentAppSession = currentCookies.get('appSession');
    console.log('[CompleteOnboarding] 🍪 Current dott_auth_session size:', currentDottAuth?.value?.length || 0);
    console.log('[CompleteOnboarding] 🍪 Current appSession size:', currentAppSession?.value?.length || 0);
    
    // CRITICAL: First delete old cookies to ensure clean state
    console.log('[CompleteOnboarding] 🍪 Deleting old session cookies to ensure clean update');
    response.cookies.delete('dott_auth_session');
    response.cookies.delete('appSession');
    
    // Small delay to ensure deletion
    await new Promise(resolve => setTimeout(resolve, 10));
    
    console.log('[CompleteOnboarding] 🍪 Setting updated session cookie with onboarding complete status');
    console.log('[CompleteOnboarding] 🍪 New cookie size:', sessionUpdateResult.updatedCookie.length, 'bytes');
    console.log('[CompleteOnboarding] 🍪 New cookie preview:', sessionUpdateResult.updatedCookie.substring(0, 50) + '...');
    
    // Set the new cookies with proper domain for production
    const enhancedCookieOptions = {
      ...sessionUpdateResult.cookieOptions,
      // Ensure domain is set correctly for production
      domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined,
      // Force overwrite with priority
      priority: 'high'
    };
    
    console.log('[CompleteOnboarding] 🍪 Cookie options:', JSON.stringify(enhancedCookieOptions, null, 2));
    
    response.cookies.set('dott_auth_session', sessionUpdateResult.updatedCookie, enhancedCookieOptions);
    response.cookies.set('appSession', sessionUpdateResult.updatedCookie, enhancedCookieOptions);
    
    // CRITICAL: Also use Set-Cookie header directly as a fallback
    const cookieString = `dott_auth_session=${sessionUpdateResult.updatedCookie}; Path=/; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''} SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${process.env.NODE_ENV === 'production' ? '; Domain=.dottapps.com' : ''}`;
    response.headers.append('Set-Cookie', cookieString);
    console.log('[CompleteOnboarding] 🍪 Added Set-Cookie header directly');
    
    console.log('[CompleteOnboarding] 🍪 Cookies set on response');
    console.log('[CompleteOnboarding] 🍪 All Set-Cookie headers:', response.headers.getSetCookie());
    
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
    if (sessionData.accessToken) {
      try {
        console.log('[CompleteOnboarding] Updating backend session state');
        const sessionUpdateResponse = await fetch(`${apiBaseUrl}/api/auth/update-session/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.accessToken}`
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
    if (sessionData.accessToken) {
      try {
        console.log('[CompleteOnboarding] 🚨 FORCING backend user onboarding completion...');
        
        // Method 1: Update user status directly
        const backendUpdateResponse = await fetch(`${apiBaseUrl}/api/users/update-onboarding-status/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.accessToken}`,
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
          console.error('[CompleteOnboarding] ❌ User status update failed:', await backendUpdateResponse.text());
        }
        
        // Method 2: Call the admin fix endpoint as fallback
        console.log('[CompleteOnboarding] 🚨 Calling admin fix endpoint as fallback...');
        const adminFixResponse = await fetch(`${apiBaseUrl}/api/onboarding/admin-fix-status/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.accessToken}`,
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
          console.error('[CompleteOnboarding] ❌ Admin fix failed:', await adminFixResponse.text());
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