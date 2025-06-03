// Server component - no 'use client' directive needed for API routes

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUser } from '@/utils/getServerUser';

// Increased cookie expiration for onboarding (7 days)
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
const COOKIE_OPTIONS = {
  path: '/',
  maxAge: COOKIE_MAX_AGE,
  httpOnly: false,
  sameSite: 'lax'
};

/**
 * Validate user authentication using our custom session management
 */
async function validateAuthentication(request) {
  try {
    console.log('[api/onboarding/business-info] Validating authentication');
    
    // Check for session cookie first
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
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
  console.log('🚨 [BUSINESS-INFO API] POST REQUEST STARTED - Version 2.1');
  console.log('🚨 [BUSINESS-INFO API] Environment:', process.env.NODE_ENV);
  console.log('🚨 [BUSINESS-INFO API] API Base URL:', process.env.NEXT_PUBLIC_API_URL);
  
  try {
    console.log('[api/onboarding/business-info] POST request received');
    
    // SECURITY: Validate authentication first
    const authResult = await validateAuthentication(request);
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
      }
    } catch (parseError) {
      console.warn('[api/onboarding/business-info] Error parsing request body:', parseError.message);
      return createSafeResponse({
        success: false,
        error: 'Invalid request data',
        message: 'Please check your input and try again'
      }, 400);
    }
    
    // Extract and validate business info data
    const businessData = {
      businessName: data.businessName || '',
      businessType: data.businessType || '',
      businessSubtypeSelections: data.businessSubtypeSelections || [],
      country: data.country || '',
      businessState: data.businessState || '',
      legalStructure: data.legalStructure || '',
      dateFounded: data.dateFounded || '',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      industry: data.industry || '',
      address: data.address || '',
      phoneNumber: data.phoneNumber || '',
      taxId: data.taxId || ''
    };
    
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
      const sessionCookie = cookieStore.get('appSession');
      let accessToken = null;
      
      if (sessionCookie) {
        try {
          const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
          accessToken = sessionData.accessToken;
        } catch (parseError) {
          console.error('[api/onboarding/business-info] Error parsing session for token:', parseError);
        }
      }
      
      if (!accessToken) {
        throw new Error('No valid access token found for backend authentication');
      }
      
      console.log('🚨 [BUSINESS-INFO API] ABOUT TO CALL DJANGO BACKEND');
      console.log('🚨 [BUSINESS-INFO API] Access token exists:', !!accessToken);
      console.log('🚨 [BUSINESS-INFO API] Backend URL:', `${apiBaseUrl}/api/onboarding/business-info/`);
      
      // Forward authenticated request to Django backend
      const backendResponse = await fetch(`${apiBaseUrl}/api/onboarding/business-info/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-User-Email': authenticatedUser.email,
          'X-Request-ID': `frontend-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          'X-Source': 'nextjs-api-route'
        },
        body: JSON.stringify(businessData),
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
          
          // Update session cookie with new onboarding status (primary fix)
          console.log('🚨 [BUSINESS-INFO API] ATTEMPTING SESSION UPDATE - Backend success path');
          console.log('🚨 [BUSINESS-INFO API] About to get cookies and update session');
          try {
            const cookieStore = await cookies();
            const sessionCookie = cookieStore.get('appSession');
            let sessionData = {};
            
            console.log('[api/onboarding/business-info] Session cookie exists:', !!sessionCookie);
            
            if (sessionCookie) {
              try {
                sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
                console.log('[api/onboarding/business-info] Parsed session data successfully, user exists:', !!sessionData.user);
              } catch (parseError) {
                console.warn('[api/onboarding/business-info] Error parsing session for update:', parseError);
                sessionData = {}; // Reset to empty object on parse error
              }
            }
            
            console.log('[api/onboarding/business-info] Current session user data before update:', {
              hasUser: !!sessionData.user,
              currentStep: sessionData.user?.currentStep,
              businessInfoCompleted: sessionData.user?.businessInfoCompleted
            });
            
            // CRITICAL FIX: Update session to move to subscription step
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
            
            const finalResponse = createSafeResponse({
              success: true,
              message: 'Business information saved successfully',
              next_step: 'subscription',
              current_step: 'subscription',
              redirect_url: '/onboarding/subscription',
              tenant_id: backendData.tenant_id || null
            });
            
            // Update the session cookie with proper settings
            const cookieSettings = {
              path: '/',
              httpOnly: true,
              secure: true, // Always use secure in production
              sameSite: 'lax',
              maxAge: 7 * 24 * 60 * 60, // 7 days
              domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
            };
            
            finalResponse.cookies.set('appSession', updatedSessionCookie, cookieSettings);
            
            console.log('[api/onboarding/business-info] ✅ SESSION SUCCESSFULLY UPDATED (backend success):', {
              currentStep: updatedSessionData.user.currentStep,
              businessInfoCompleted: updatedSessionData.user.businessInfoCompleted,
              needsOnboarding: updatedSessionData.user.needsOnboarding,
              cookieSet: true,
              cookieSize: updatedSessionCookie.length,
              cookieSettings: cookieSettings,
              nodeEnv: process.env.NODE_ENV
            });
            return finalResponse;
            
          } catch (sessionError) {
            console.error('[api/onboarding/business-info] ❌ CRITICAL ERROR updating session:', {
              error: sessionError.message,
              stack: sessionError.stack,
              name: sessionError.name
            });
            // Return success but with warning
            return createSafeResponse({
              success: true,
              message: 'Business information saved, but session update failed',
              next_step: 'subscription',
              redirect_url: '/onboarding/subscription',
              tenant_id: backendData.tenant_id || null,
              warning: 'Session update failed - you may need to refresh',
              sessionError: sessionError.message
            });
          }
        } catch (jsonError) {
          console.log('[api/onboarding/business-info] Django backend responded OK but no JSON data');
          backendSuccess = true; // Still consider it successful
          backendData = { success: true, message: 'Business info saved successfully' };
          
          // Still update session for successful submission with proper onboarding step
          try {
            const cookieStore = await cookies();
            const sessionCookie = cookieStore.get('appSession');
            let sessionData = {};
            
            if (sessionCookie) {
              try {
                sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
              } catch (parseError) {
                console.warn('[api/onboarding/business-info] Error parsing session for update:', parseError);
              }
            }
            
            // CRITICAL FIX: Update session to move to subscription step
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
            
            const response = createSafeResponse({
              success: true,
              message: 'Business information saved successfully',
              next_step: 'subscription',
              current_step: 'subscription',
              redirect_url: '/onboarding/subscription'
            });
            
            response.cookies.set('appSession', updatedSessionCookie, {
              path: '/',
              httpOnly: true,
              secure: true, // Always use secure in production
              sameSite: 'lax',
              maxAge: 7 * 24 * 60 * 60, // 7 days
              domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
            });
            
            console.log('[api/onboarding/business-info] Session updated to subscription step (no JSON case):', {
              currentStep: updatedSessionData.user.currentStep,
              businessInfoCompleted: updatedSessionData.user.businessInfoCompleted
            });
            return response;
            
          } catch (sessionError) {
            console.error('[api/onboarding/business-info] Error updating session after Django success:', sessionError);
            // Return success but indicate session issue
            return createSafeResponse({
              success: true,
              message: 'Business information saved, but session update failed',
              next_step: 'subscription',
              warning: 'You may need to refresh the page'
            });
          }
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
        tenant_id: backendData.tenant_id || null
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