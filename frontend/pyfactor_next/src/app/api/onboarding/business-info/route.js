// Server component - no 'use client' directive needed for API routes

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUser } from '@/utils/getServerUser';
import { auth0 } from '@/lib/auth0';

// Increased cookie expiration for onboarding (7 days)
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
const COOKIE_OPTIONS = {
  path: '/',
  maxAge: COOKIE_MAX_AGE,
  httpOnly: false,
  sameSite: 'lax'
};

/**
 * Validate user authentication before processing request
 */
async function validateAuthentication(request) {
  try {
    // Check Auth0 session using v4.x API
    const session = await auth0.getSession(request);
    if (!session || !session.user) {
      return { 
        isAuthenticated: false, 
        error: 'Authentication required',
        user: null 
      };
    }
    
    return { 
      isAuthenticated: true, 
      user: session.user,
      error: null 
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
 * Handle business information update - SECURE VERSION
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
      // Continue with empty data object
    }
    
    console.log('[api/onboarding/business-info] Setting up response data');
    
    // Start the cookie setup early
    const responseData = {
      success: true,
      message: 'Business information updated successfully',
      nextRoute: '/onboarding/subscription'
    };
    
    console.log('[api/onboarding/business-info] About to access cookies');
    
    // Set critical cookies immediately
    try {
      const cookieStore = await cookies();
      
      console.log('[api/onboarding/business-info] Setting cookies');
      
      // Mark business info step as completed
      await cookieStore.set('businessInfoCompleted', 'true', COOKIE_OPTIONS);
      await cookieStore.set('onboardingStep', 'subscription', COOKIE_OPTIONS);
      await cookieStore.set('onboardedStatus', 'business_info', COOKIE_OPTIONS);
      
      // Set timestamp for token verification
      await cookieStore.set('lastOnboardingUpdate', new Date().toISOString(), COOKIE_OPTIONS);
      
      console.log('[api/onboarding/business-info] Cookies set successfully');
    } catch (cookieError) {
      console.error('[api/onboarding/business-info] Error setting cookies:', cookieError);
      throw new Error(`Cookie error: ${cookieError.message}`);
    }
    
    // Check for faster path header
    const headers = Object.fromEntries(request.headers.entries());
    const isFastPath = headers['x-fast-path'] === 'true';
    
    // Set navigation response header to help with redirect
    const responseHeaders = new Headers();
    responseHeaders.append('X-Next-Route', '/onboarding/subscription');
    
    // If fast path, return immediately with just the navigation cookies
    if (isFastPath) {
      console.log('[api/onboarding/business-info] Using fast path, returning early');
      return createSafeResponse(responseData, 200, responseHeaders);
    }
    
    console.log('[api/onboarding/business-info] Getting server user');
    
    // Try to get authenticated user but don't fail if not present
    let user = null;
    try {
      user = await getServerUser(request);
      console.log('[api/onboarding/business-info] User retrieved:', { hasUser: !!user });
    } catch (authError) {
      console.error('[api/onboarding/business-info] Auth error:', {
        message: authError.message,
        code: authError.code,
        name: authError.name
      });
      
      // Continue processing without user
    }
    
    // Ensure we have at least some data - use defaults if necessary
    const businessName = data.businessName || user?.attributes?.['custom:businessname'] || '';
    const businessType = data.businessType || user?.attributes?.['custom:businesstype'] || '';
    const country = data.country || user?.attributes?.['custom:businesscountry'] || '';
    const legalStructure = data.legalStructure || user?.attributes?.['custom:legalstructure'] || '';
    
    console.log('[api/onboarding/business-info] Business info update:', {
      userPresent: !!user,
      fields: Object.keys(data),
      businessName,
      businessType
    });

    try {
      const cookieStore = await cookies();
      
      // Store business info in cookies
      await cookieStore.set('businessName', businessName, COOKIE_OPTIONS);
      await cookieStore.set('businessType', businessType, COOKIE_OPTIONS);
      
      // Only set these if they have values
      if (country) {
        await cookieStore.set('businessCountry', country, COOKIE_OPTIONS);
      }
      
      if (legalStructure) {
        await cookieStore.set('legalStructure', legalStructure, COOKIE_OPTIONS);
      }
    } catch (cookieError) {
      console.error('[api/onboarding/business-info] Error setting additional cookies:', cookieError);
      // Continue even if these cookies fail
    }
    
    console.log('[api/onboarding/business-info] Creating successful response');
    
    // Update response with business info
    return createSafeResponse({
      success: true,
      message: 'Business information updated successfully',
      nextRoute: '/onboarding/subscription',
      businessInfo: {
        businessName,
        businessType,
        country,
        legalStructure
      }
    });
  } catch (error) {
    console.error('[api/onboarding/business-info] Error updating business info:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    // Even on error, still try to set the essential cookies
    try {
      const cookieStore = await cookies();
      
      // Mark business info step as completed
      await cookieStore.set('businessInfoCompleted', 'true', COOKIE_OPTIONS);
      await cookieStore.set('onboardingStep', 'subscription', COOKIE_OPTIONS);
      await cookieStore.set('onboardedStatus', 'business_info', COOKIE_OPTIONS);
      
      return createSafeResponse({
        success: false,
        error: 'Failed to update business information',
        message: error.message,
        fallback: true
      }, 500);
    } catch (cookieError) {
      // Last resort error response if even cookie setting fails
      console.error('[api/onboarding/business-info] Fatal error setting cookies:', cookieError);
      
      return createSafeResponse({
        success: false,
        error: 'Critical error updating business information',
        message: error.message,
        fallback: true
      }, 500);
    }
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