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
      
      console.log('[api/onboarding/business-info] Forwarding to Django backend with Auth0 token');
      
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
      
      if (backendResponse.ok) {
        try {
          backendData = await backendResponse.json();
          backendSuccess = true;
          console.log('[api/onboarding/business-info] Backend save successful:', {
            hasTenantId: !!backendData.tenant_id,
            success: backendData.success
          });
          
          // If Django backend succeeds, update session and progress
          if (backendResponse.ok) {
            try {
              const backendResult = await backendResponse.json();
              console.log('[api/onboarding/business-info] Django backend success:', {
                success: backendResult.success,
                message: backendResult.message
              });
              
              // Update user's onboarding progress to next step
              try {
                const progressUpdateResponse = await fetch(`${apiBaseUrl}/api/users/update-onboarding-step/`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'X-User-Email': authenticatedUser.email,
                    'X-User-Sub': authenticatedUser.sub,
                    'X-Source': 'business-info-completion'
                  },
                  body: JSON.stringify({
                    current_step: 'subscription',
                    needs_onboarding: true,
                    onboarding_completed: false,
                    business_info_completed: true
                  })
                });
                
                if (progressUpdateResponse.ok) {
                  console.log('[api/onboarding/business-info] User onboarding step updated to subscription');
                } else {
                  console.warn('[api/onboarding/business-info] Failed to update onboarding step, but continuing');
                }
              } catch (progressError) {
                console.warn('[api/onboarding/business-info] Error updating onboarding progress:', progressError);
                // Continue - don't fail the whole request for this
              }
              
              // Update session cookie with new onboarding status
              try {
                const updatedSessionData = {
                  ...sessionData,
                  user: {
                    ...sessionData.user,
                    currentStep: 'subscription',
                    needsOnboarding: true,
                    onboardingCompleted: false,
                    businessInfoCompleted: true
                  }
                };
                
                const updatedSessionCookie = Buffer.from(JSON.stringify(updatedSessionData)).toString('base64');
                
                const finalResponse = createSafeResponse({
                  success: true,
                  message: 'Business information saved successfully',
                  next_step: 'subscription',
                  redirect_url: '/onboarding/subscription'
                });
                
                // Update the session cookie
                finalResponse.cookies.set('appSession', updatedSessionCookie, {
                  path: '/',
                  httpOnly: false,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'lax',
                  maxAge: 7 * 24 * 60 * 60 // 7 days
                });
                
                console.log('[api/onboarding/business-info] Business info completed, session updated, ready for subscription');
                return finalResponse;
                
              } catch (sessionError) {
                console.error('[api/onboarding/business-info] Error updating session:', sessionError);
                // Continue without session update
              }
              
              return createSafeResponse({
                success: true,
                message: 'Business information saved successfully',
                next_step: 'subscription',
                redirect_url: '/onboarding/subscription'
              });
              
            } catch (jsonError) {
              console.log('[api/onboarding/business-info] Django backend responded OK but no JSON data');
              
              // Still update session for successful submission
              try {
                const updatedSessionData = {
                  ...sessionData,
                  user: {
                    ...sessionData.user,
                    currentStep: 'subscription',
                    needsOnboarding: true,
                    onboardingCompleted: false,
                    businessInfoCompleted: true
                  }
                };
                
                const updatedSessionCookie = Buffer.from(JSON.stringify(updatedSessionData)).toString('base64');
                
                const response = createSafeResponse({
                  success: true,
                  message: 'Business information saved successfully',
                  next_step: 'subscription'
                });
                
                response.cookies.set('appSession', updatedSessionCookie, COOKIE_OPTIONS);
                return response;
                
              } catch (sessionError) {
                console.error('[api/onboarding/business-info] Error updating session after Django success:', sessionError);
              }
              
              return createSafeResponse({
                success: true,
                message: 'Business information saved successfully',
                next_step: 'subscription'
              });
            }
          } else {
            const errorText = await backendResponse.text().catch(() => 'Unknown error');
            console.error('[api/onboarding/business-info] Backend save failed:', {
              status: backendResponse.status,
              statusText: backendResponse.statusText,
              error: errorText
            });
            
            // Continue with cookie storage even if backend fails (graceful degradation)
            console.log('[api/onboarding/business-info] Continuing with cookie storage despite backend failure');
          }
          
          // ALWAYS set cookies for caching/fallback (regardless of backend success)
          try {
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
            
            // Mark business info step as completed (cached)
            await cookieStore.set('businessInfoCompleted', 'true', COOKIE_OPTIONS);
            await cookieStore.set('onboardingStep', 'subscription', COOKIE_OPTIONS);
            await cookieStore.set('onboardedStatus', 'business_info', COOKIE_OPTIONS);
            
            // Cache business data
            await cookieStore.set('businessName', businessData.businessName, COOKIE_OPTIONS);
            await cookieStore.set('businessType', businessData.businessType, COOKIE_OPTIONS);
            
            return createSafeResponse({
              success: true, // Still successful from user perspective
              message: 'Business information saved locally (backend temporarily unavailable)',
              nextRoute: '/onboarding/subscription',
              businessInfo: {
                businessName: businessData.businessName,
                businessType: businessData.businessType,
                country: businessData.country,
                legalStructure: businessData.legalStructure
              },
              backendStatus: 'offline',
              fallback: true
            });
          } catch (fallbackError) {
            console.error('[api/onboarding/business-info] Complete failure:', fallbackError);
            
            return createSafeResponse({
              success: false,
              error: 'Failed to save business information',
              message: 'Please try again or contact support if the problem persists'
            }, 500);
          }
        }
      } else {
        const errorText = await backendResponse.text().catch(() => 'Unknown error');
        console.error('[api/onboarding/business-info] Backend save failed:', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          error: errorText
        });
        
        // Continue with cookie storage even if backend fails (graceful degradation)
        console.log('[api/onboarding/business-info] Continuing with cookie storage despite backend failure');
      }
      
    } catch (backendError) {
      console.error('[api/onboarding/business-info] Backend communication failed:', {
        message: backendError.message,
        stack: backendError.stack
      });
      
      // Graceful degradation: save to cookies even if backend fails
      try {
        const cookieStore = await cookies();
        
        // Mark business info step as completed (cached)
        await cookieStore.set('businessInfoCompleted', 'true', COOKIE_OPTIONS);
        await cookieStore.set('onboardingStep', 'subscription', COOKIE_OPTIONS);
        await cookieStore.set('onboardedStatus', 'business_info', COOKIE_OPTIONS);
        
        // Cache business data
        await cookieStore.set('businessName', businessData.businessName, COOKIE_OPTIONS);
        await cookieStore.set('businessType', businessData.businessType, COOKIE_OPTIONS);
        
        return createSafeResponse({
          success: true, // Still successful from user perspective
          message: 'Business information saved locally (backend temporarily unavailable)',
          nextRoute: '/onboarding/subscription',
          businessInfo: {
            businessName: businessData.businessName,
            businessType: businessData.businessType,
            country: businessData.country,
            legalStructure: businessData.legalStructure
          },
          backendStatus: 'offline',
          fallback: true
        });
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
    console.error('[api/onboarding/business-info] Critical error:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
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