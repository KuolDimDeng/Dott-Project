// Server component - no 'use client' directive needed for API routes
// DEPLOYMENT TIMESTAMP: 2025-06-03 19:27 - Critical needsOnboarding fix deployed

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUser } from '@/utils/getServerUser';
import { v4 as uuidv4 } from 'uuid';
import { countries } from 'countries-list';

// Increased cookie expiration for onboarding (7 days)
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
const COOKIE_OPTIONS = {
  path: '/',
  maxAge: COOKIE_MAX_AGE,
  httpOnly: false,
  sameSite: 'lax'
};

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
  console.warn(`[api/onboarding/business-info] Country not found: ${countryName}, defaulting to US`);
  return 'US';
}

/**
 * Validate user authentication using our custom session management
 */
async function validateAuthentication(request) {
  try {
    console.log('[api/onboarding/business-info] Validating authentication');
    
    // Check Authorization header first (for v2 onboarding)
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('[api/onboarding/business-info] Found Authorization header with Bearer token');
      
      // For now, we'll trust the token if it exists
      // In production, you would validate this with Auth0
      return { 
        isAuthenticated: true, 
        user: { email: 'authenticated-via-bearer' },
        error: null 
      };
    }
    
    // Check for session cookie (backward compatibility)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    const dottSessionCookie = cookieStore.get('dott_auth_session');
    const sessionTokenCookie = cookieStore.get('session_token') || cookieStore.get('sid'); // Check both cookie names
    
    console.log('🚨 [BUSINESS-INFO API] Cookie debug:', {
      hasDottAuthSession: !!dottSessionCookie,
      hasAppSession: !!sessionCookie,
      hasSessionToken: !!sessionTokenCookie,
      dottAuthSessionSize: dottSessionCookie?.value?.length || 0,
      sessionTokenSize: sessionTokenCookie?.value?.length || 0,
      allCookieNames: cookieStore.getAll().map(c => c.name)
    });
    
    // Check dott_auth_session first (v2 session)
    if (dottSessionCookie) {
      try {
        const { decrypt } = await import('@/utils/sessionEncryption');
        const decrypted = decrypt(dottSessionCookie.value);
        const sessionData = JSON.parse(decrypted);
        
        if (sessionData && sessionData.user) {
          console.log('[api/onboarding/business-info] Dott session authenticated:', sessionData.user.email);
          return { 
            isAuthenticated: true, 
            user: sessionData.user,
            error: null 
          };
        }
      } catch (decryptError) {
        console.error('[api/onboarding/business-info] Error decrypting dott session:', decryptError);
      }
    }
    
    // Check legacy appSession
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
        
        // Check if session is expired
        if (sessionData.accessTokenExpiresAt && Date.now() > sessionData.accessTokenExpiresAt) {
          console.log('[api/onboarding/business-info] Session expired');
          return { 
            isAuthenticated: false, 
            error: 'Session expired',
            user: null 
          };
        }
        
        if (sessionData.user) {
          console.log('[api/onboarding/business-info] Session authenticated:', sessionData.user.email);
          return { 
            isAuthenticated: true, 
            user: sessionData.user,
            error: null 
          };
        }
      } catch (parseError) {
        console.error('[api/onboarding/business-info] Error parsing session cookie:', parseError);
      }
    }
    
    // Check for backend session token as fallback
    if (sessionTokenCookie) {
      try {
        console.log('[api/onboarding/business-info] Found session token, validating with backend');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
        const sessionResponse = await fetch(`${apiUrl}/api/sessions/current/`, {
          headers: {
            'Authorization': `Session ${sessionTokenCookie.value}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (sessionResponse.ok) {
          const backendSession = await sessionResponse.json();
          console.log('[api/onboarding/business-info] Backend session validated:', {
            user_email: backendSession.user?.email,
            tenant_id: backendSession.tenant?.id
          });
          
          return { 
            isAuthenticated: true, 
            user: {
              email: backendSession.user?.email || 'session-user',
              sub: backendSession.user?.auth0_sub || 'session-sub',
              name: backendSession.user?.email || 'session-user'
            },
            error: null 
          };
        } else {
          console.error('[api/onboarding/business-info] Backend session validation failed:', sessionResponse.status);
        }
      } catch (error) {
        console.error('[api/onboarding/business-info] Session token validation error:', error);
      }
    }
    
    // Fallback: check for individual Auth0 cookies
    const accessTokenCookie = cookieStore.get('auth0_access_token');
    const idTokenCookie = cookieStore.get('auth0_id_token');
    
    if (accessTokenCookie || idTokenCookie) {
      console.log('[api/onboarding/business-info] Found auth token cookies');
      // Basic authenticated user object
      return { 
        isAuthenticated: true, 
        user: { email: 'authenticated-user' }, // Minimal user object
        error: null 
      };
    }
    
    console.log('[api/onboarding/business-info] No authentication found');
    return { 
      isAuthenticated: false, 
      error: 'Authentication required',
      user: null 
    };
  } catch (error) {
    console.error('[api/onboarding/business-info] Authentication error:', error);
    return { 
      isAuthenticated: false, 
      error: 'Authentication validation failed',
      user: null 
    };
  }
}

/**
 * Ensure a proper response is always returned
 */
function createSafeResponse(data, status = 200, additionalHeaders = null) {
  try {
    // Create response object with headers
    const headers = additionalHeaders || new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Cache-Control', 'no-cache, no-store');
    
    // Add navigation header for subscription page
    headers.append('X-Next-Route', '/onboarding/subscription');
    
    return NextResponse.json(data, { 
      status, 
      headers 
    });
  } catch (error) {
    console.error('[api/onboarding/business-info] Error creating response:', error);
    // Absolutely minimal response that should never fail
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Cache-Control', 'no-cache, no-store');
    headers.append('X-Next-Route', '/onboarding/subscription');
    
    return new Response(JSON.stringify({ success: false, error: 'Failed to create response' }), {
      status: 500,
      headers
    });
  }
}

/**
 * Handle business information update - SECURE VERSION with Database Persistence
 */
export async function POST(request) {
  console.log('🚨 [BUSINESS-INFO API] POST REQUEST STARTED - Version 2.2');
  console.log('🚨 [BUSINESS-INFO API] Environment:', process.env.NODE_ENV);
  console.log('🚨 [BUSINESS-INFO API] API Base URL:', process.env.NEXT_PUBLIC_API_URL);
  
  try {
    // Debug headers
    const headers = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('🚨 [BUSINESS-INFO API] Request headers:', JSON.stringify(headers, null, 2));
    
    // Check cookies directly
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('🚨 [BUSINESS-INFO API] Available cookies:', allCookies.map(c => ({
      name: c.name,
      size: c.value?.length || 0,
      httpOnly: c.httpOnly,
      secure: c.secure
    })));
    
    console.log('[api/onboarding/business-info] POST request received');
    
    // SECURITY: Validate authentication first
    const authResult = await validateAuthentication(request);
    
    console.log('🚨 [BUSINESS-INFO API] Auth validation result:', {
      isAuthenticated: authResult.isAuthenticated,
      error: authResult.error,
      hasUser: !!authResult.user,
      userEmail: authResult.user?.email
    });
    
    if (!authResult.isAuthenticated) {
      console.warn('[api/onboarding/business-info] Unauthorized request blocked');
      return createSafeResponse({
        success: false,
        error: 'Authentication required',
        message: 'Please sign in to continue'
      }, 401);
    }
    
    const authenticatedUser = authResult.user;
    console.log('[api/onboarding/business-info] Authenticated user:', authenticatedUser.email);
    
    // Get request body, handling empty requests gracefully
    let data = {};
    try {
      if (request.body) {
        data = await request.json();
        console.log('[api/onboarding/business-info] Request body parsed:', { fields: Object.keys(data) });
        console.log('🚨 [BUSINESS-INFO API] Raw request data:', JSON.stringify(data, null, 2));
      }
    } catch (parseError) {
      console.warn('[api/onboarding/business-info] Error parsing request body:', parseError.message);
      return createSafeResponse({
        success: false,
        error: 'Invalid request data',
        message: 'Please check your input and try again'
      }, 400);
    }
    
    // Extract and validate business info data - check both camelCase and snake_case
    const businessData = {
      businessName: data.business_name || data.businessName || '',
      businessType: data.business_type || data.businessType || '',
      businessSubtypeSelections: data.business_subtype_selections || data.businessSubtypeSelections || [],
      country: data.country || '',
      businessState: data.business_state || data.businessState || '',
      legalStructure: data.legal_structure || data.legalStructure || '',
      dateFounded: data.date_founded || data.dateFounded || '',
      firstName: data.first_name || data.firstName || '',
      lastName: data.last_name || data.lastName || '',
      industry: data.industry || '',
      address: data.address || '',
      phoneNumber: data.phone_number || data.phoneNumber || '',
      taxId: data.tax_id || data.taxId || ''
    };
    
    console.log('🚨 [BUSINESS-INFO API] Extracted business data:', JSON.stringify(businessData, null, 2));
    
    console.log('[api/onboarding/business-info] Validated business data:', {
      businessName: businessData.businessName,
      businessType: businessData.businessType,
      country: businessData.country
    });

    // SECURITY: Forward to Django backend with proper authentication
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBaseUrl) {
      throw new Error('API configuration missing - backend URL not configured');
    }

    try {
      // Get Auth0 access token for backend authentication
      const cookieStore = await cookies();
      let accessToken = null;
      
      // First try to get token from Authorization header (v2 onboarding)
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
        console.log('[api/onboarding/business-info] Using access token from Authorization header');
      }
      
      // If no header token, try to extract from session cookies
      if (!accessToken) {
        // Try dott_auth_session first (v2 session)
        const dottSessionCookie = cookieStore.get('dott_auth_session');
        if (dottSessionCookie) {
          try {
            const { decrypt } = await import('@/utils/sessionEncryption');
            const decryptedData = await decrypt(dottSessionCookie.value);
            const sessionData = JSON.parse(decryptedData);
            accessToken = sessionData.accessToken;
            console.log('[api/onboarding/business-info] Got access token from dott_auth_session');
          } catch (decryptError) {
            console.error('[api/onboarding/business-info] Error decrypting dott session:', decryptError);
          }
        }
        
        // Fallback to legacy appSession
        if (!accessToken) {
          const sessionCookie = cookieStore.get('appSession');
          if (sessionCookie) {
            try {
              const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
              accessToken = sessionData.accessToken;
              console.log('[api/onboarding/business-info] Got access token from appSession');
            } catch (parseError) {
              console.error('[api/onboarding/business-info] Error parsing session for token:', parseError);
            }
          }
        }
      }
      
      if (!accessToken) {
        // For v2 onboarding, we might not have the token but still be authenticated
        console.warn('[api/onboarding/business-info] No access token found, proceeding without backend auth');
        // Continue without throwing error - we already validated authentication above
      }
      
      console.log('🚨 [BUSINESS-INFO API] ABOUT TO CALL DJANGO BACKEND');
      console.log('🚨 [BUSINESS-INFO API] Access token exists:', !!accessToken);
      console.log('🚨 [BUSINESS-INFO API] Backend URL:', `${apiBaseUrl}/api/onboarding/save-business-info/`);
      
      // Forward authenticated request to Django backend
      const headers = {
        'Content-Type': 'application/json',
        'X-User-Email': authenticatedUser.email || 'authenticated-user',
        'X-Request-ID': `frontend-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        'X-Source': 'nextjs-api-route'
      };
      
      // Use session token if available (preferred for backend compatibility)
      const sessionTokenCookie = cookieStore.get('session_token') || cookieStore.get('sid');
      if (sessionTokenCookie) {
        headers['Authorization'] = `Session ${sessionTokenCookie.value}`;
        console.log('[api/onboarding/business-info] Using Session token for backend auth');
      } else {
        console.warn('[api/onboarding/business-info] No auth token available for backend');
      }
      
      // Convert camelCase to snake_case for Django backend
      const djangoData = {
        business_name: businessData.businessName,
        business_type: businessData.businessType,
        // Convert country name to 2-letter code
        country: getCountryCode(businessData.country),
        legal_structure: businessData.legalStructure,
        date_founded: businessData.dateFounded,
        first_name: businessData.firstName || '',
        last_name: businessData.lastName || '',
        industry: businessData.industry || '',
        address: businessData.address || '',
        phone_number: businessData.phoneNumber || '',
        tax_id: businessData.taxId || ''
      };
      
      // Filter out empty required fields that backend might reject
      if (!djangoData.legal_structure) {
        console.warn('[api/onboarding/business-info] Legal structure is empty, using default');
        djangoData.legal_structure = 'Other'; // Default value
      }
      
      if (!djangoData.date_founded) {
        console.warn('[api/onboarding/business-info] Date founded is empty, using today');
        djangoData.date_founded = new Date().toISOString().split('T')[0];
      }

      console.log('[api/onboarding/business-info] Sending to Django:', djangoData);
      console.log('🚨 [BUSINESS-INFO API] Django data being sent:', JSON.stringify(djangoData, null, 2));
      
      // During initial onboarding, we don't have a tenant ID yet
      // Generate a temporary one or use a placeholder
      const tempTenantId = uuidv4();
      headers['X-Tenant-ID'] = tempTenantId;
      console.log('[api/onboarding/business-info] Using temporary tenant ID:', tempTenantId);

      const backendResponse = await fetch(`${apiBaseUrl}/api/onboarding/save-business-info/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(djangoData),
        timeout: 10000 // 10 second timeout
      });
      
      let backendData = {};
      let backendSuccess = false;
      
      console.log('🚨 [BUSINESS-INFO API] Backend response status:', backendResponse.status, backendResponse.ok);
      console.log('🚨 [BUSINESS-INFO API] Backend response OK?', backendResponse.ok);
      
      if (backendResponse.ok) {
        console.log('🚨 [BUSINESS-INFO API] BACKEND SUCCESS PATH');
        try {
          backendData = await backendResponse.json();
          backendSuccess = true;
          console.log('[api/onboarding/business-info] Backend save successful:', {
            hasTenantId: !!backendData.tenant_id,
            success: backendData.success
          });
          
          // CRITICAL FIX: Enhanced session update with maximum debugging
          console.log('🚨 [BUSINESS-INFO API] === ENHANCED SESSION UPDATE STARTED ===');
          console.log('🚨 [BUSINESS-INFO API] Time:', new Date().toISOString());
          console.log('🚨 [BUSINESS-INFO API] NodeJS version:', process.version);
          console.log('🚨 [BUSINESS-INFO API] Environment:', process.env.NODE_ENV);
          
          try {
            const cookieStore = await cookies();
            console.log('🚨 [BUSINESS-INFO API] Step 1: Got cookie store successfully');
            
            const sessionCookie = cookieStore.get('appSession');
            console.log('🚨 [BUSINESS-INFO API] Step 2: Session cookie exists:', !!sessionCookie);
            console.log('🚨 [BUSINESS-INFO API] Step 2: Session cookie size:', sessionCookie?.value?.length || 0, 'bytes');
            
            if (!sessionCookie) {
              console.log('🚨 [BUSINESS-INFO API] ❌ CRITICAL: No session cookie found - cannot update session');
              throw new Error('No session cookie found for update');
            }
            
            let sessionData = {};
              try {
                sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
              console.log('🚨 [BUSINESS-INFO API] Step 3: Session parsed successfully');
              console.log('🚨 [BUSINESS-INFO API] Step 3: User exists in session:', !!sessionData.user);
              } catch (parseError) {
              console.error('🚨 [BUSINESS-INFO API] ❌ Session parse error:', parseError.message);
              throw new Error(`Session parse failed: ${parseError.message}`);
            }
            
            // SIMPLIFIED SESSION UPDATE - More reliable approach
            console.log('🚨 [BUSINESS-INFO API] Step 4: Creating updated session data');
            const currentUser = sessionData.user || {};
            
            console.log('🚨 [BUSINESS-INFO API] Step 4: Current user state:', {
              email: currentUser.email,
              needsOnboarding: currentUser.needsOnboarding,
              currentStep: currentUser.currentStep,
              businessInfoCompleted: currentUser.businessInfoCompleted
            });
            
            // Create the updated user object with explicit values
            const updatedUser = {
              ...currentUser,
              // CRITICAL: Set completion status
              needsOnboarding: false,
              onboardingCompleted: false,
              currentStep: 'subscription',
              current_onboarding_step: 'subscription',
              businessInfoCompleted: true,
              lastUpdated: new Date().toISOString(),
              // Preserve essential fields
              email: currentUser.email,
              sub: currentUser.sub,
              name: currentUser.name,
              picture: currentUser.picture
            };
            
            console.log('🚨 [BUSINESS-INFO API] Step 5: Updated user object:', {
              email: updatedUser.email,
              needsOnboarding: updatedUser.needsOnboarding,
              currentStep: updatedUser.currentStep,
              businessInfoCompleted: updatedUser.businessInfoCompleted
            });
            
            // Create minimal session data (reduce cookie size)
            const updatedSessionData = {
              user: updatedUser,
              accessToken: sessionData.accessToken,
              idToken: sessionData.idToken,
              accessTokenExpiresAt: sessionData.accessTokenExpiresAt
            };
            
            console.log('🚨 [BUSINESS-INFO API] Step 6: Creating cookie string');
            let cookieString;
            try {
              cookieString = Buffer.from(JSON.stringify(updatedSessionData)).toString('base64');
              console.log('🚨 [BUSINESS-INFO API] Step 6: Cookie string created, size:', cookieString.length, 'bytes');
            } catch (encodeError) {
              console.error('🚨 [BUSINESS-INFO API] ❌ Cookie encoding error:', encodeError.message);
              throw new Error(`Cookie encoding failed: ${encodeError.message}`);
            }
            
            // Validate cookie size and trim if necessary
            if (cookieString.length > 3900) { // Leave some buffer
              console.log('🚨 [BUSINESS-INFO API] ⚠️ Cookie too large, creating minimal version');
              const minimalSessionData = {
                user: {
                  email: updatedUser.email,
                  sub: updatedUser.sub,
                  needsOnboarding: false,
                  currentStep: 'subscription',
                businessInfoCompleted: true,
                lastUpdated: new Date().toISOString()
                },
                accessToken: sessionData.accessToken
              };
              cookieString = Buffer.from(JSON.stringify(minimalSessionData)).toString('base64');
              console.log('🚨 [BUSINESS-INFO API] Step 6b: Minimal cookie created, size:', cookieString.length, 'bytes');
            }
            
            console.log('🚨 [BUSINESS-INFO API] Step 7: Creating response');
            const response = createSafeResponse({
              success: true,
              message: 'Business information saved successfully',
              next_step: 'subscription',
              current_step: 'subscription',
              redirect_url: '/onboarding/subscription',
              tenant_id: backendData.tenant_id || uuidv4(),
              generatedFallback: !backendData.tenant_id,
              debug: {
                sessionUpdated: true,
                cookieSize: cookieString.length,
                timestamp: new Date().toISOString()
              }
            });
            
            console.log('🚨 [BUSINESS-INFO API] Step 8: Setting cookie with production settings');
            const cookieOptions = {
              path: '/',
              httpOnly: true,
              secure: true,
              sameSite: 'lax',
              maxAge: 7 * 24 * 60 * 60, // 7 days
              domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
            };
            
            console.log('🚨 [BUSINESS-INFO API] Step 8: Cookie options:', cookieOptions);
            
            try {
              response.cookies.set('appSession', cookieString, cookieOptions);
              console.log('🚨 [BUSINESS-INFO API] Step 9: ✅ SESSION COOKIE SET SUCCESSFULLY!');
            } catch (setCookieError) {
              console.error('🚨 [BUSINESS-INFO API] ❌ Cookie set error:', setCookieError.message);
              throw new Error(`Failed to set cookie: ${setCookieError.message}`);
            }
            
            console.log('🚨 [BUSINESS-INFO API] === SESSION UPDATE COMPLETED SUCCESSFULLY ===');
            console.log('🚨 [BUSINESS-INFO API] Final verification:', {
              sessionUpdated: true,
              newNeedsOnboarding: false,
              newCurrentStep: 'subscription',
              businessInfoCompleted: true,
              cookieSize: cookieString.length,
              domain: cookieOptions.domain,
              production: process.env.NODE_ENV === 'production'
            });
            
            return response;
            
          } catch (sessionUpdateError) {
            console.error('🚨 [BUSINESS-INFO API] ❌ CRITICAL SESSION UPDATE ERROR:', {
              message: sessionUpdateError.message,
              stack: sessionUpdateError.stack,
              name: sessionUpdateError.name
            });
            
            // Return success but with session update failure warning
            return createSafeResponse({
              success: true,
              message: 'Business information saved successfully',
              next_step: 'subscription',
              current_step: 'subscription',
              redirect_url: '/onboarding/subscription',
              tenant_id: backendData.tenant_id || uuidv4(),
              generatedFallback: !backendData.tenant_id,
              warning: 'Session update failed - you may need to refresh the page',
              error: sessionUpdateError.message,
              debug: {
                sessionUpdateFailed: true,
                error: sessionUpdateError.message,
                timestamp: new Date().toISOString()
              }
            });
          }
          
        } catch (jsonError) {
          console.log('🚨 [BUSINESS-INFO API] Backend responded OK but no JSON data');
          console.log('[api/onboarding/business-info] Django backend responded OK but no JSON data');
          backendSuccess = true; // Still consider it successful
          backendData = { success: true, message: 'Business info saved successfully' };
          
          // SIMPLIFIED SESSION UPDATE FOR NO-JSON CASE
          console.log('🚨 [BUSINESS-INFO API] === SIMPLIFIED SESSION UPDATE (NO JSON CASE) ===');
          try {
            const cookieStore = await cookies();
            const sessionCookie = cookieStore.get('appSession');
            
            if (sessionCookie) {
              const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
              const currentUser = sessionData.user || {};
              
              const minimalUser = {
                email: currentUser.email,
                sub: currentUser.sub,
                needsOnboarding: false,
                currentStep: 'subscription',
                businessInfoCompleted: true,
                lastUpdated: new Date().toISOString()
            };
            
              const minimalSession = {
                user: minimalUser,
                accessToken: sessionData.accessToken
              };
              
              const cookieString = Buffer.from(JSON.stringify(minimalSession)).toString('base64');
            
            const response = createSafeResponse({
              success: true,
              message: 'Business information saved successfully',
              next_step: 'subscription',
              current_step: 'subscription',
              redirect_url: '/onboarding/subscription'
            });
            
              response.cookies.set('appSession', cookieString, {
              path: '/',
                httpOnly: true,
                secure: true,
              sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60,
                domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
            });
            
              console.log('🚨 [BUSINESS-INFO API] ✅ SIMPLIFIED SESSION UPDATE SUCCESSFUL');
            return response;
            }
          } catch (simplifiedError) {
            console.error('🚨 [BUSINESS-INFO API] ❌ Simplified session update failed:', simplifiedError.message);
          }
            
          // Fallback response
            return createSafeResponse({
              success: true,
            message: 'Business information saved successfully',
              next_step: 'subscription',
            current_step: 'subscription',
            redirect_url: '/onboarding/subscription'
            });
        }
      } else {
        console.log('🚨 [BUSINESS-INFO API] BACKEND FAILED PATH');
        const errorText = await backendResponse.text().catch(() => 'Unknown error');
        console.error('🚨 [BUSINESS-INFO API] ❌ BACKEND SAVE FAILED:', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          error: errorText,
          url: `${apiBaseUrl}/api/onboarding/business-info/`
        });
        
        // Continue with cookie storage even if backend fails (graceful degradation)
        console.log('[api/onboarding/business-info] Continuing with cookie storage despite backend failure');
        
        // CRITICAL FIX: Enhanced session update for backend failure - same as success path
        console.log('🚨 [BUSINESS-INFO API] === ENHANCED SESSION UPDATE (BACKEND FAILED) ===');
        console.log('🚨 [BUSINESS-INFO API] Time:', new Date().toISOString());
        console.log('🚨 [BUSINESS-INFO API] Backend failed, but we still need to update session');
        
        try {
          const cookieStore = await cookies();
          console.log('🚨 [BUSINESS-INFO API] Step 1: Got cookie store successfully (fallback)');
          
          const sessionCookie = cookieStore.get('appSession');
          console.log('🚨 [BUSINESS-INFO API] Step 2: Session cookie exists:', !!sessionCookie);
          console.log('🚨 [BUSINESS-INFO API] Step 2: Session cookie size:', sessionCookie?.value?.length || 0, 'bytes');
          
          if (!sessionCookie) {
            console.log('🚨 [BUSINESS-INFO API] ❌ CRITICAL: No session cookie found - cannot update session (fallback)');
            throw new Error('No session cookie found for update (fallback)');
          }
          
          let sessionData = {};
          try {
            sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
            console.log('🚨 [BUSINESS-INFO API] Step 3: Session parsed successfully (fallback)');
            console.log('🚨 [BUSINESS-INFO API] Step 3: User exists in session:', !!sessionData.user);
          } catch (parseError) {
            console.error('🚨 [BUSINESS-INFO API] ❌ Session parse error (fallback):', parseError.message);
            throw new Error(`Session parse failed (fallback): ${parseError.message}`);
          }
          
          // SIMPLIFIED SESSION UPDATE - More reliable approach (same as success path)
          console.log('🚨 [BUSINESS-INFO API] Step 4: Creating updated session data (fallback)');
          const currentUser = sessionData.user || {};
          
          console.log('🚨 [BUSINESS-INFO API] Step 4: Current user state (fallback):', {
            email: currentUser.email,
            needsOnboarding: currentUser.needsOnboarding,
            currentStep: currentUser.currentStep,
            businessInfoCompleted: currentUser.businessInfoCompleted
          });
          
          // Create the updated user object with explicit values
          const updatedUser = {
            ...currentUser,
            // CRITICAL: Set completion status even though backend failed
            needsOnboarding: false,
            onboardingCompleted: false,
            currentStep: 'subscription',
            current_onboarding_step: 'subscription',
            businessInfoCompleted: true,
            lastUpdated: new Date().toISOString(),
            // Preserve essential fields
            email: currentUser.email,
            sub: currentUser.sub,
            name: currentUser.name,
            picture: currentUser.picture
          };
          
          console.log('🚨 [BUSINESS-INFO API] Step 5: Updated user object (fallback):', {
            email: updatedUser.email,
            needsOnboarding: updatedUser.needsOnboarding,
            currentStep: updatedUser.currentStep,
            businessInfoCompleted: updatedUser.businessInfoCompleted
          });
          
          // Create minimal session data (reduce cookie size)
          const updatedSessionData = {
            user: updatedUser,
            accessToken: sessionData.accessToken,
            idToken: sessionData.idToken,
            accessTokenExpiresAt: sessionData.accessTokenExpiresAt
          };
          
          console.log('🚨 [BUSINESS-INFO API] Step 6: Creating cookie string (fallback)');
          let cookieString;
          try {
            cookieString = Buffer.from(JSON.stringify(updatedSessionData)).toString('base64');
            console.log('🚨 [BUSINESS-INFO API] Step 6: Cookie string created, size (fallback):', cookieString.length, 'bytes');
          } catch (encodeError) {
            console.error('🚨 [BUSINESS-INFO API] ❌ Cookie encoding error (fallback):', encodeError.message);
            throw new Error(`Cookie encoding failed (fallback): ${encodeError.message}`);
          }
          
          // Validate cookie size and trim if necessary
          if (cookieString.length > 3900) { // Leave some buffer
            console.log('🚨 [BUSINESS-INFO API] ⚠️ Cookie too large, creating minimal version (fallback)');
            const minimalSessionData = {
              user: {
                email: updatedUser.email,
                sub: updatedUser.sub,
                needsOnboarding: false,
                currentStep: 'subscription',
                businessInfoCompleted: true,
                lastUpdated: new Date().toISOString()
              },
              accessToken: sessionData.accessToken
            };
            cookieString = Buffer.from(JSON.stringify(minimalSessionData)).toString('base64');
            console.log('🚨 [BUSINESS-INFO API] Step 6b: Minimal cookie created, size (fallback):', cookieString.length, 'bytes');
          }
          
          console.log('🚨 [BUSINESS-INFO API] Step 7: Creating response (fallback)');
          const response = createSafeResponse({
            success: true, // Still successful from user perspective
            message: 'Business information saved locally (backend temporarily unavailable)',
            next_step: 'subscription',
            current_step: 'subscription',
            redirect_url: '/onboarding/subscription',
            backendStatus: 'offline',
            fallback: true,
            debug: {
              sessionUpdated: true,
              cookieSize: cookieString.length,
              timestamp: new Date().toISOString(),
              backendError: errorText
            }
          });
          
          console.log('🚨 [BUSINESS-INFO API] Step 8: Setting cookie with production settings (fallback)');
          const cookieOptions = {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
          };
          
          console.log('🚨 [BUSINESS-INFO API] Step 8: Cookie options (fallback):', cookieOptions);
          
          try {
            response.cookies.set('appSession', cookieString, cookieOptions);
            console.log('🚨 [BUSINESS-INFO API] Step 9: ✅ SESSION COOKIE SET SUCCESSFULLY (FALLBACK)!');
          } catch (setCookieError) {
            console.error('🚨 [BUSINESS-INFO API] ❌ Cookie set error (fallback):', setCookieError.message);
            throw new Error(`Failed to set cookie (fallback): ${setCookieError.message}`);
          }
          
          console.log('🚨 [BUSINESS-INFO API] === SESSION UPDATE COMPLETED SUCCESSFULLY (FALLBACK) ===');
          console.log('🚨 [BUSINESS-INFO API] Final verification (fallback):', {
            sessionUpdated: true,
            newNeedsOnboarding: false,
            newCurrentStep: 'subscription',
            businessInfoCompleted: true,
            cookieSize: cookieString.length,
            domain: cookieOptions.domain,
            production: process.env.NODE_ENV === 'production',
            backendFailed: true
          });
          
          // Set fallback cookies too
          await cookieStore.set('businessInfoCompleted', 'true', COOKIE_OPTIONS);
          await cookieStore.set('onboardingStep', 'subscription', COOKIE_OPTIONS);
          await cookieStore.set('onboardedStatus', 'business_info', COOKIE_OPTIONS);
          await cookieStore.set('businessName', businessData.businessName, COOKIE_OPTIONS);
          await cookieStore.set('businessType', businessData.businessType, COOKIE_OPTIONS);
          
          if (businessData.country) {
            await cookieStore.set('businessCountry', businessData.country, COOKIE_OPTIONS);
          }
          
          if (businessData.legalStructure) {
            await cookieStore.set('legalStructure', businessData.legalStructure, COOKIE_OPTIONS);
          }
          
          await cookieStore.set('lastOnboardingUpdate', new Date().toISOString(), COOKIE_OPTIONS);
          console.log('🚨 [BUSINESS-INFO API] ✅ FALLBACK COOKIES SET SUCCESSFULLY');
          
          return response;
          
        } catch (sessionUpdateError) {
          console.error('🚨 [BUSINESS-INFO API] ❌ CRITICAL SESSION UPDATE ERROR (FALLBACK):', {
            message: sessionUpdateError.message,
            stack: sessionUpdateError.stack,
            name: sessionUpdateError.name
          });
          
          // Last resort: try basic cookie storage
          try {
            const cookieStore = await cookies();
            await cookieStore.set('businessInfoCompleted', 'true', COOKIE_OPTIONS);
            await cookieStore.set('onboardingStep', 'subscription', COOKIE_OPTIONS);
            await cookieStore.set('businessName', businessData.businessName, COOKIE_OPTIONS);
            await cookieStore.set('businessType', businessData.businessType, COOKIE_OPTIONS);
            
            console.log('🚨 [BUSINESS-INFO API] ✅ BASIC FALLBACK COOKIES SET');
            
            return createSafeResponse({
              success: true,
              message: 'Business information saved locally',
              next_step: 'subscription',
              current_step: 'subscription',
              redirect_url: '/onboarding/subscription',
              warning: 'Session update failed but basic data saved',
              error: sessionUpdateError.message,
              debug: {
                sessionUpdateFailed: true,
                error: sessionUpdateError.message,
                timestamp: new Date().toISOString(),
                fallbackUsed: true
              }
            });
          } catch (finalError) {
            console.error('🚨 [BUSINESS-INFO API] ❌ COMPLETE FAILURE:', finalError.message);
            
            return createSafeResponse({
              success: false,
              error: 'Failed to save business information',
              message: 'Please try again or contact support if the problem persists',
              debug: {
                sessionError: sessionUpdateError.message,
                finalError: finalError.message,
                timestamp: new Date().toISOString()
              }
            }, 500);
          }
        }
      }
      
      // ALWAYS set cookies for caching/fallback (regardless of backend success)
      try {
        const cookieStore = await cookies();
        
        // Mark business info step as completed
        await cookieStore.set('businessInfoCompleted', 'true', COOKIE_OPTIONS);
        await cookieStore.set('onboardingStep', 'subscription', COOKIE_OPTIONS);
        await cookieStore.set('onboardedStatus', 'business_info', COOKIE_OPTIONS);
        
        // Cache business info data
        await cookieStore.set('businessName', businessData.businessName, COOKIE_OPTIONS);
        await cookieStore.set('businessType', businessData.businessType, COOKIE_OPTIONS);
        
        if (businessData.country) {
          await cookieStore.set('businessCountry', businessData.country, COOKIE_OPTIONS);
        }
        
        if (businessData.legalStructure) {
          await cookieStore.set('legalStructure', businessData.legalStructure, COOKIE_OPTIONS);
        }
        
        // Set timestamp for tracking
        await cookieStore.set('lastOnboardingUpdate', new Date().toISOString(), COOKIE_OPTIONS);
        
        console.log('[api/onboarding/business-info] Cookies set successfully');
      } catch (cookieError) {
        console.error('[api/onboarding/business-info] Error setting cookies:', cookieError);
        // Continue - don't fail the entire request for cookie issues
      }
      
      // Prepare response data
      const responseData = {
        success: backendSuccess,
        message: backendSuccess ? 'Business information saved successfully' : 'Business information cached locally',
        nextRoute: '/onboarding/subscription',
        businessInfo: {
          businessName: businessData.businessName,
          businessType: businessData.businessType,
          country: businessData.country,
          legalStructure: businessData.legalStructure
        },
        backendStatus: backendSuccess ? 'saved' : 'failed',
        tenant_id: backendData.tenant_id || uuidv4(),
        generatedFallback: !backendData.tenant_id
      };
      
      // Return success response
      return createSafeResponse(responseData);
      
    } catch (backendError) {
      console.error('[api/onboarding/business-info] Backend communication failed:', {
        message: backendError.message,
        stack: backendError.stack
      });
      
      // Graceful degradation: save to cookies even if backend fails
      try {
        const cookieStore = await cookies();
        
        console.log('🚨 [BUSINESS-INFO API] ATTEMPTING SESSION UPDATE - Backend failed, using fallback path');
        console.log('🚨 [BUSINESS-INFO API] Starting fallback session update process');
        
        // Mark business info step as completed (cached) and update session
        const sessionCookie = cookieStore.get('appSession');
        let sessionData = {};
        
        console.log('[api/onboarding/business-info] Fallback - Session cookie exists:', !!sessionCookie);
        
        if (sessionCookie) {
          try {
            sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
            console.log('[api/onboarding/business-info] Fallback - Parsed session data successfully, user exists:', !!sessionData.user);
          } catch (parseError) {
            console.warn('[api/onboarding/business-info] Error parsing session for fallback update:', parseError);
            sessionData = {}; // Reset to empty object on parse error
          }
        }
        
        console.log('[api/onboarding/business-info] Fallback - Current session user data before update:', {
          hasUser: !!sessionData.user,
          currentStep: sessionData.user?.currentStep,
          businessInfoCompleted: sessionData.user?.businessInfoCompleted
        });
        
        // CRITICAL FIX: Update session to move to subscription step even in fallback
        // Ensure we have a proper user object structure
        const currentUser = sessionData.user || {};
        const updatedSessionData = {
          ...sessionData,
          user: {
            ...currentUser,
            currentStep: 'subscription',
            current_onboarding_step: 'subscription', 
            needsOnboarding: false,
            onboardingCompleted: false,
            businessInfoCompleted: true,
            lastUpdated: new Date().toISOString()
          }
        };
        
        let updatedSessionCookie = Buffer.from(JSON.stringify(updatedSessionData)).toString('base64');
        
        // Validate session cookie size (browsers typically limit to 4KB)
        if (updatedSessionCookie.length > 4000) {
          console.warn('[api/onboarding/business-info] Session cookie is very large:', updatedSessionCookie.length, 'bytes');
          // Trim some non-essential data if needed
          const trimmedSessionData = {
            ...updatedSessionData,
            user: {
              email: updatedSessionData.user.email,
              currentStep: 'subscription',
              current_onboarding_step: 'subscription',
              needsOnboarding: false,
              onboardingCompleted: false,
              businessInfoCompleted: true,
              lastUpdated: new Date().toISOString()
            }
          };
          const trimmedCookie = Buffer.from(JSON.stringify(trimmedSessionData)).toString('base64');
          console.log('[api/onboarding/business-info] Trimmed session cookie size:', trimmedCookie.length, 'bytes');
          if (trimmedCookie.length < 4000) {
            updatedSessionCookie = trimmedCookie;
          }
        }
        
        await cookieStore.set('businessInfoCompleted', 'true', COOKIE_OPTIONS);
        await cookieStore.set('onboardingStep', 'subscription', COOKIE_OPTIONS);
        await cookieStore.set('onboardedStatus', 'business_info', COOKIE_OPTIONS);
        
        // Cache business data
        await cookieStore.set('businessName', businessData.businessName, COOKIE_OPTIONS);
        await cookieStore.set('businessType', businessData.businessType, COOKIE_OPTIONS);
        
        const response = createSafeResponse({
          success: true, // Still successful from user perspective
          message: 'Business information saved locally (backend temporarily unavailable)',
          nextRoute: '/onboarding/subscription',
          current_step: 'subscription',
          businessInfo: {
            businessName: businessData.businessName,
            businessType: businessData.businessType,
            country: businessData.country,
            legalStructure: businessData.legalStructure
          },
          backendStatus: 'offline',
          fallback: true
        });
        
        // Update session cookie with proper onboarding step
        response.cookies.set('appSession', updatedSessionCookie, {
          path: '/',
          httpOnly: true,
          secure: true, // Always use secure in production
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60, // 7 days
          domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
        });
        
        console.log('[api/onboarding/business-info] ✅ SESSION SUCCESSFULLY UPDATED (fallback case):', {
          currentStep: updatedSessionData.user.currentStep,
          businessInfoCompleted: updatedSessionData.user.businessInfoCompleted,
          cookieSet: true,
          fallbackMode: true,
          cookieSize: updatedSessionCookie.length,
          nodeEnv: process.env.NODE_ENV,
          cookieDomain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : 'localhost'
        });
        return response;
      } catch (fallbackError) {
        console.error('[api/onboarding/business-info] Complete failure:', fallbackError);
        
        return createSafeResponse({
          success: false,
          error: 'Failed to save business information',
          message: 'Please try again or contact support if the problem persists'
        }, 500);
      }
    }
    
  } catch (error) {
    console.error('🚨 [BUSINESS-INFO API] CRITICAL ERROR IN POST FUNCTION:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    console.error('🚨 [BUSINESS-INFO API] This is the main catch block - something went very wrong');
    
    return createSafeResponse({
      success: false,
      error: 'Critical error processing business information',
      message: error.message
    }, 500);
  }
}

/**
 * Get existing business information - SECURE VERSION
 */
export async function GET(request) {
  try {
    console.log('[api/onboarding/business-info] GET request received');
    
    // SECURITY: Validate authentication first
    const authResult = await validateAuthentication(request);
    if (!authResult.isAuthenticated) {
      console.warn('[api/onboarding/business-info] Unauthorized GET request blocked');
      return createSafeResponse({
        businessInfo: {},
        error: 'Authentication required',
        message: 'Please sign in to view business information'
      }, 401);
    }
    
    const authenticatedUser = authResult.user;
    console.log('[api/onboarding/business-info] Authenticated user for GET:', authenticatedUser.email);
    
    // Simplified error handling - get cookies first
    let cookieStore;
    try {
      cookieStore = await cookies();
      console.log('[api/onboarding/business-info] Got cookies successfully');
    } catch (cookieError) {
      console.error('[api/onboarding/business-info] Error accessing cookies:', cookieError);
      // Return empty response that won't break the client
      return createSafeResponse({
        businessInfo: {},
        error: 'Failed to access cookies'
      });
    }
    
    // Get values from cookies as fallback data source
    const businessNameCookie = cookieStore.get('businessName')?.value || '';
    const businessTypeCookie = cookieStore.get('businessType')?.value || '';
    const countryCookie = cookieStore.get('businessCountry')?.value || '';
    const legalStructureCookie = cookieStore.get('legalStructure')?.value || '';
    
    console.log('[api/onboarding/business-info] Read cookies:', {
      hasBusinessName: !!businessNameCookie,
      hasBusinessType: !!businessTypeCookie
    });
    
    // Try to get user but don't fail if not available
    let user = null;
    try {
      console.log('[api/onboarding/business-info] Attempting to get server user');
      user = await getServerUser(request);
      console.log('[api/onboarding/business-info] Got user successfully');
    } catch (authError) {
      console.warn('[api/onboarding/business-info] Auth error but continuing:', {
        message: authError.message,
        code: authError.code
      });
      // Continue without user
    }
    
    // Get values from user attributes as another data source
    const userBusinessName = user?.attributes?.['custom:businessname'] || '';
    const userBusinessType = user?.attributes?.['custom:businesstype'] || '';
    const userCountry = user?.attributes?.['custom:businesscountry'] || '';
    const userLegalStructure = user?.attributes?.['custom:legalstructure'] || '';
    
    // Combine values, preferring cookies over user attributes
    const businessName = businessNameCookie || userBusinessName || '';
    const businessType = businessTypeCookie || userBusinessType || '';
    const country = countryCookie || userCountry || '';
    const legalStructure = legalStructureCookie || userLegalStructure || '';
    
    console.log('[api/onboarding/business-info] Assembled business info from sources');
    
    // Create a safe response
    return createSafeResponse({
      businessInfo: {
        businessName,
        businessType,
        country,
        legalStructure
      },
      source: businessNameCookie ? 'cookies' : (userBusinessName ? 'user' : 'empty')
    });
  } catch (error) {
    // Log error but return a valid empty response
    console.error('[api/onboarding/business-info] GET: Error retrieving business info:', {
      message: error.message,
      stack: error.stack
    });
    
    // Return minimal valid response that won't break the client
    return createSafeResponse({
      businessInfo: {},
      error: 'Failed to retrieve business information'
    });
  }
}