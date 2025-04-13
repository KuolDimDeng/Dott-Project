import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';
import { getServerUser } from '@/utils/getServerUser';
import { cookies } from 'next/headers';
import { getDefaultTenantId } from '@/middleware/dev-tenant-middleware';
import { v4 as uuidv4 } from 'uuid';
import { jwtDecode } from 'jwt-decode';
import { createServerLogger } from '@/utils/createServerLogger';

// Add getCookieValue helper function at the top of the file
function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Parses and extracts custom attributes from Cognito ID token
 * @param {string} cookieHeader - Raw cookie header from request
 * @returns {Object} - Object containing extracted user attributes
 */
function extractCognitoAttributes(cookieHeader) {
  try {
    if (!cookieHeader) return null;
    
    // Find the LastAuthUser value
    const lastAuthUserMatch = cookieHeader.match(/CognitoIdentityServiceProvider\.[^.]+\.LastAuthUser=([^;]+)/);
    if (!lastAuthUserMatch) return null;
    
    const cognitoUserId = lastAuthUserMatch[1];
    
    // Find the ID token using the user ID
    const idTokenMatch = cookieHeader.match(new RegExp(`CognitoIdentityServiceProvider\\.[^.]+\\.${cognitoUserId}\\.idToken=([^;]+)`));
    if (!idTokenMatch) return null;
    
    const idToken = decodeURIComponent(idTokenMatch[1]);
    
    // Decode the JWT token
    const decodedToken = jwtDecode(idToken);
    
    // Log all custom attributes for debugging
    const customAttributes = Object.keys(decodedToken).filter(key => key.startsWith('custom:'));
    logger.debug('[API] Extracted Cognito token custom attributes:', {
      customKeys: customAttributes,
      firstname: decodedToken['custom:firstname'],
      lastname: decodedToken['custom:lastname'],
      businessname: decodedToken['custom:businessname'],
      tenant_ID: decodedToken['custom:tenant_ID']
    });
    
    // Extract all user attributes from token
    return {
      sub: decodedToken.sub,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified,
      firstName: decodedToken['custom:firstname'] || decodedToken.given_name || '',
      lastName: decodedToken['custom:lastname'] || decodedToken.family_name || '',
      first_name: decodedToken['custom:firstname'] || decodedToken.given_name || '',
      last_name: decodedToken['custom:lastname'] || decodedToken.family_name || '',
      given_name: decodedToken['custom:firstname'] || decodedToken.given_name || '',
      family_name: decodedToken['custom:lastname'] || decodedToken.family_name || '',
      businessName: decodedToken['custom:businessname'] || decodedToken['custom:tenant_name'] || '',
      tenantId: decodedToken['custom:tenant_ID'] || decodedToken['custom:businessid'] || '',
      role: decodedToken['custom:userrole'] || 'client',
      subscriptionType: decodedToken['custom:subplan'] || 'free',
      businessType: decodedToken['custom:businesstype'] || '',
      rawToken: decodedToken
    };
  } catch (error) {
    logger.warn('[API] Error extracting Cognito attributes:', error);
    return null;
  }
}

// Function to fetch Cognito user data
async function fetchCognitoUserData(token) {
  try {
    if (!token) return null;
    
    // In a production app, this would make an actual call to Cognito
    // For now, we'll just decode the token and return the payload
    const decodedToken = jwtDecode(token);
    
    // DEBUGGING: Log the full token structure to understand attributes
    const allKeys = Object.keys(decodedToken);
    const customKeys = allKeys.filter(k => k.startsWith('custom:'));
    
    // Check if attributes might be case-sensitive
    const lowerCaseKeys = {};
    const upperCaseKeys = {};
    allKeys.forEach(key => {
      if (key.toLowerCase() !== key) {
        lowerCaseKeys[key.toLowerCase()] = decodedToken[key];
      }
      if (key.toUpperCase() !== key) {
        upperCaseKeys[key.toUpperCase()] = decodedToken[key];
      }
    });
    
    logger.debug('[API] JWT Token structure:', {
      allKeys,
      customKeys,
      hasEmail: !!decodedToken.email,
      hasFirstname: !!decodedToken['custom:firstname'],
      hasLastname: !!decodedToken['custom:lastname'],
      hasBusinessName: !!decodedToken['custom:businessname'],
      // Check for different cases
      upperCaseFirstname: decodedToken['CUSTOM:FIRSTNAME'],
      upperCaseBusinessname: decodedToken['CUSTOM:BUSINESSNAME'],
      alternativeCase: decodedToken['Custom:Firstname'],
      lowerCaseKeys: Object.keys(lowerCaseKeys),
      upperCaseKeys: Object.keys(upperCaseKeys),
    });
    
    // Add debug logging to see what attributes are available
    logger.debug('[API] Decoded token attributes:', {
      keys: Object.keys(decodedToken).filter(k => k.startsWith('custom:')),
      firstname: decodedToken['custom:firstname'],
      lastname: decodedToken['custom:lastname'],
      businessname: decodedToken['custom:businessname'],
      email: decodedToken.email
    });
    
    return {
      sub: decodedToken.sub,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified,
      given_name: decodedToken['custom:firstname'] || decodedToken.given_name || '',
      family_name: decodedToken['custom:lastname'] || decodedToken.family_name || '',
      first_name: decodedToken['custom:firstname'] || decodedToken.given_name || '',
      last_name: decodedToken['custom:lastname'] || decodedToken.family_name || '',
      'custom:firstname': decodedToken['custom:firstname'] || '',
      'custom:lastname': decodedToken['custom:lastname'] || '',
      'custom:businessname': decodedToken['custom:businessname'] || '',
      'custom:businesstype': decodedToken['custom:businesstype'] || '',
      'custom:subplan': decodedToken['custom:subplan'] || 'free',
      'custom:userrole': decodedToken['custom:userrole'] || 'client',
      'custom:tenant_ID': decodedToken['custom:tenant_ID'] || '',
      'custom:onboarding': decodedToken['custom:onboarding'] || 'incomplete',
      'custom:setupdone': decodedToken['custom:setupdone'] || 'false'
    };
  } catch (error) {
    console.warn('[API] Error fetching Cognito user data:', error);
    return null;
  }
}

/**
 * API endpoint to fetch user profile data
 * 
 * Optimized for RLS architecture to quickly return user information
 * without unnecessary database queries.
 */
export async function GET(req) {
  try {
    // Parse URL to extract parameters
    const url = new URL(req.url);
    const tenantIdParam = url.searchParams.get('tenantId');
    const email = url.searchParams.get('email');
    
    // Get the request tenantId
    const effectiveTenantId = tenantIdParam || req.headers.get('x-tenant-id');
    
    // Check for debug parameter
    const debug = url.searchParams.get('debug') === 'true';
    
    // Check if this is a signup flow request
    const isSignUpFlow = url.searchParams.get('signup') === 'true' || 
                         req.headers.get('X-SignUp-Flow') === 'true';
    
    // Check if this is a dashboard request
    const isDashboardRequest = url.searchParams.get('dashboard') === 'true' || 
                              req.headers.get('X-Dashboard-Route') === 'true' ||
                              req.headers.get('Referer')?.includes('/dashboard');
    
    // Get cookie header
    const cookieHeader = req.headers.get('cookie');
    
    // Get auth token from header
    const authHeader = req.headers.get('authorization');
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Configure the logger with more info
    const loggingContext = {
      tenantId: effectiveTenantId || 'no-tenant',
      module: 'API',
      endpoint: 'profile'
    };
    const logger = createServerLogger(loggingContext);
    
    // Check for minimal business name in sign-up flow - important for the issue reported
    // Allow these requests to proceed even when user is not fully authenticated
    const isMinimalBusinessName = req.headers.get('X-Business-Name') === 'Default Business' || 
                                req.headers.get('X-Business-Name') === 'My Business';
    
    // Handle sign-up flow differently - provide a minimal profile even when not authenticated
    if (isSignUpFlow || (isDashboardRequest && !token)) {
      logger.info('[API] Handling sign-up or dashboard request without auth');
      
      // Extract email from query or cookie
      const userEmail = email || getCookieValue(cookieHeader, 'email') || getCookieValue(cookieHeader, 'emailForSignIn');
      
      // Get business name from header or cookie
      const businessName = req.headers.get('X-Business-Name') || 
                          getCookieValue(cookieHeader, 'businessName') || 
                          'My Business';
      
      // Use provided tenant ID or create a fallback
      const tenantId = effectiveTenantId || getDefaultTenantId();
      
      // Create a minimal profile for sign-up flow
      return NextResponse.json({
        profile: {
          id: 'temp-user-id',
          email: userEmail || '',
          name: '',
          firstName: '',
          lastName: '',
          tenantId: tenantId,
          role: 'client',
          businessName: businessName,
          isSigningUp: true,
          onboardingStatus: 'incomplete',
          setupComplete: false,
          preferences: {
            theme: 'light',
            notificationsEnabled: true
          }
        }
      });
    }
    
    // Attempt to get user from the server side
    const serverUser = await getServerUser(req);
    
    // We've already created a logger above, so just use it directly here
    // No need to configure a new one
    
    if (serverUser) {
      // Skip verbose logging, just log at debug level with minimal info
      if (debug) {
        logger.debug('[API] Decoded Cognito token:', {
          sub: serverUser.sub,
          email: serverUser.email,
          attributes: Object.keys(serverUser).filter(key => key.startsWith('custom:'))
        });
      }
      
      // Only log tenant ID info, not full attributes
      logger.info('[API] Using dynamically retrieved tenant ID:', effectiveTenantId || serverUser.sub);
      
      // Build response with caching headers to reduce repeated calls
      const response = NextResponse.json({
        profile: {
          id: serverUser.sub || serverUser.username,
          email: serverUser.email,
          name: serverUser.name || `${serverUser.given_name || ''} ${serverUser.family_name || ''}`.trim(),
          firstName: serverUser.given_name || serverUser.first_name,
          lastName: serverUser.family_name || serverUser.last_name,
          first_name: serverUser.given_name || serverUser.first_name, // Add both formats for compatibility
          last_name: serverUser.family_name || serverUser.last_name,  // Add both formats for compatibility
          fullName: serverUser.name || `${serverUser.given_name || ''} ${serverUser.family_name || ''}`.trim(),
          tenantId: effectiveTenantId || serverUser.sub,
          role: serverUser['custom:role'] || serverUser['custom:userrole'] || 'client',
          onboardingStatus: serverUser['custom:onboarding'] || 'incomplete',
          setupComplete: serverUser['custom:setupdone'] === 'true',
          businessName: serverUser['custom:businessname'],
          businessType: serverUser['custom:businesstype'],
          subscriptionType: serverUser['custom:subplan'] || 'free',
          subscription_type: serverUser['custom:subplan'] || 'free', // Both formats for compatibility
          preferences: {
            theme: 'light',
            notificationsEnabled: true
          }
        }
      });
      
      // Add cache control headers to reduce repeated calls
      response.headers.set('Cache-Control', 'private, max-age=30');
      
      return response;
    }
    
    // Extract from cookies as fallback if no server user
    let authUser = null;
    let businessName = null;
    let businessType = null;
    let firstName = null;
    let lastName = null;
    
    // Only log once that no ID token was found
    logger.debug('[getServerUser] No ID token found');
    
    // Extract user attributes from cookie with minimal logging
    if (cookieHeader) {
      authUser = getCookieValue(cookieHeader, 'authUser') || getCookieValue(cookieHeader, 'pyfactor_username');
      businessName = getCookieValue(cookieHeader, 'businessName');
      businessType = getCookieValue(cookieHeader, 'businessType');
      firstName = getCookieValue(cookieHeader, 'firstName') || 
                 getCookieValue(cookieHeader, 'given_name') || 
                 getCookieValue(cookieHeader, 'first_name');
      lastName = getCookieValue(cookieHeader, 'lastName') || 
               getCookieValue(cookieHeader, 'family_name') || 
               getCookieValue(cookieHeader, 'last_name');
    }
    
    // Log once with all details instead of multiple logs
    logger.info('[API] Using Cognito attributes from cookies:', {
      email: authUser || email,
      firstName,
      lastName,
      businessName,
      tenantId: effectiveTenantId
    });
    
    // Try to extract Cognito attributes directly from cookies
    const cognitoAttributes = extractCognitoAttributes(cookieHeader);
    
    // Use tenant ID from multiple sources, prioritizing query params, headers, then cookies
    const finalTenantId = tenantIdParam || effectiveTenantId || cognitoAttributes?.tenantId;
    
    if (finalTenantId) {
      logger.info(`[API] Using dynamically retrieved tenant ID: ${finalTenantId}`);
    } else {
      logger.info('[API] No tenant ID found, will attempt to retrieve from user authentication');
    }
    
    // Check if we have a valid token and use fetchCognitoUserData if we do
    if (token) {
      try {
        // Use fetchCognitoUserData to extract user data from the token
        const tokenUserData = await fetchCognitoUserData(token);
        if (tokenUserData && tokenUserData.email) {
          logger.info('[API] Retrieved user data from token:', {
            email: tokenUserData.email,
            sub: tokenUserData.sub
          });
          
          // Use the token data as our authenticated user source
          return NextResponse.json({
            profile: {
              id: tokenUserData.sub,
              email: tokenUserData.email,
              name: `${tokenUserData.given_name || ''} ${tokenUserData.family_name || ''}`.trim(),
              firstName: tokenUserData.given_name,
              lastName: tokenUserData.family_name,
              first_name: tokenUserData.first_name,
              last_name: tokenUserData.last_name,
              fullName: `${tokenUserData.given_name || ''} ${tokenUserData.family_name || ''}`.trim(),
              tenantId: effectiveTenantId || tokenUserData.sub,
              role: tokenUserData['custom:userrole'] || 'client',
              businessName: tokenUserData['custom:businessname'],
              businessType: tokenUserData['custom:businesstype'],
              subscriptionType: tokenUserData['custom:subplan'] || 'free',
              subscription_type: tokenUserData['custom:subplan'] || 'free',
              preferences: {
                theme: 'light',
                notificationsEnabled: true
              }
            }
          });
        }
      } catch (tokenError) {
        logger.warn('[API] Error processing token:', tokenError);
        // Continue to other authentication methods
      }
    }
    
    // Try to get user from server-side authentication
    const authUserFromServer = await getServerUser(req);
    if (authUserFromServer) {
      logger.info('[API] Retrieved authenticated user from server:', {
        email: authUserFromServer.email,
        userId: authUserFromServer.sub,
        firstName: authUserFromServer.given_name || authUserFromServer.first_name,
        lastName: authUserFromServer.family_name || authUserFromServer.last_name,
        tenantId: finalTenantId || authUserFromServer.sub // Use user ID as tenant ID if none provided
      });
      
      // Return authenticated user information with enhanced attribute mapping
      return NextResponse.json({
        profile: {
          id: authUserFromServer.sub || authUserFromServer.username,
          email: authUserFromServer.email,
          name: authUserFromServer.name || `${authUserFromServer.given_name || ''} ${authUserFromServer.family_name || ''}`.trim(),
          firstName: authUserFromServer.given_name || authUserFromServer.first_name,
          lastName: authUserFromServer.family_name || authUserFromServer.last_name,
          first_name: authUserFromServer.given_name || authUserFromServer.first_name, // Add both formats for compatibility
          last_name: authUserFromServer.family_name || authUserFromServer.last_name,  // Add both formats for compatibility
          fullName: authUserFromServer.name || `${authUserFromServer.given_name || ''} ${authUserFromServer.family_name || ''}`.trim(),
          tenantId: finalTenantId || authUserFromServer.sub,
          role: authUserFromServer['custom:role'] || authUserFromServer['custom:userrole'] || 'client',
          onboardingStatus: authUserFromServer['custom:onboarding'] || 'incomplete',
          setupComplete: authUserFromServer['custom:setupdone'] === 'true',
          businessName: authUserFromServer['custom:businessname'],
          businessType: authUserFromServer['custom:businesstype'],
          subscriptionType: authUserFromServer['custom:subplan'] || 'free',
          subscription_type: authUserFromServer['custom:subplan'] || 'free', // Both formats for compatibility
          preferences: {
            theme: 'light',
            notificationsEnabled: true
          }
        }
      });
    }
    
    // If we have Cognito attributes from cookies, use them
    if (cognitoAttributes) {
      logger.info('[API] Using Cognito attributes from cookies:', {
        email: cognitoAttributes.email,
        firstName: cognitoAttributes.firstName,
        lastName: cognitoAttributes.lastName,
        businessName: cognitoAttributes.businessName,
        tenantId: cognitoAttributes.tenantId
      });
      
      return NextResponse.json({
        profile: {
          id: cognitoAttributes.sub,
          email: cognitoAttributes.email,
          name: `${cognitoAttributes.firstName || ''} ${cognitoAttributes.lastName || ''}`.trim(),
          firstName: cognitoAttributes.firstName,
          lastName: cognitoAttributes.lastName,
          first_name: cognitoAttributes.firstName, // Add both formats for compatibility
          last_name: cognitoAttributes.lastName,   // Add both formats for compatibility
          fullName: `${cognitoAttributes.firstName || ''} ${cognitoAttributes.lastName || ''}`.trim(),
          tenantId: finalTenantId || cognitoAttributes.tenantId,
          role: cognitoAttributes.role || 'client',
          onboardingStatus: 'complete',
          setupComplete: true,
          businessName: cognitoAttributes.businessName,
          businessType: cognitoAttributes.businessType,
          subscriptionType: cognitoAttributes.subscriptionType || 'free',
          subscription_type: cognitoAttributes.subscriptionType || 'free', // Both formats
          preferences: {
            theme: 'light',
            notificationsEnabled: true
          }
        }
      });
    }
    
    // Extract email from cookies as fallback
    let authUserFromCookies = null;
    let businessNameFromCookies = null;
    let businessTypeFromCookies = null;
    let firstNameFromCookies = null;
    let lastNameFromCookies = null;
    
    if (cookieHeader) {
      authUserFromCookies = getCookieValue(cookieHeader, 'authUser') || getCookieValue(cookieHeader, 'pyfactor_username');
      businessNameFromCookies = getCookieValue(cookieHeader, 'businessName');
      businessTypeFromCookies = getCookieValue(cookieHeader, 'businessType');
      firstNameFromCookies = getCookieValue(cookieHeader, 'firstName') || 
                 getCookieValue(cookieHeader, 'given_name') || 
                 getCookieValue(cookieHeader, 'first_name');
      lastNameFromCookies = getCookieValue(cookieHeader, 'lastName') || 
               getCookieValue(cookieHeader, 'family_name') || 
               getCookieValue(cookieHeader, 'last_name');
    }
    
    // Prepare profile data from Cognito authenticated user and other available data
    const userEmail = authUserFromServer?.email || authUserFromCookies || email || getCookieValue(cookieHeader, 'email') || getCookieValue(cookieHeader, 'userEmail');
    const fallbackEmail = userEmail || "";
    
    if (!userEmail || !finalTenantId) {
      // Check if this is a dashboard request
      const requestUrl = req.url || '';
      const referer = req.headers.get('referer') || '';
      const isDashboardRequest = 
        referer.includes('/dashboard') || 
        requestUrl.includes('dashboard=true') ||
        req.headers.get('X-Dashboard-Route') === 'true';
      
      if (isDashboardRequest) {
        // For dashboard, use available data and create fallback profile
        const fallbackTenantId = finalTenantId || getDefaultTenantId();
        
        // Generate username from email if available
        const username = fallbackEmail ? fallbackEmail.split('@')[0] : '';
        const generatedFirstName = username ? username.charAt(0).toUpperCase() + username.slice(1) : '';
        
        logger.info(`[API] Creating fallback profile for dashboard: ${fallbackTenantId}`);
        
        return NextResponse.json({
          profile: {
            id: fallbackTenantId,
            email: fallbackEmail,
            tenantId: fallbackTenantId,
            role: 'client',
            firstName: firstNameFromCookies || generatedFirstName,
            lastName: lastNameFromCookies || '',
            first_name: firstNameFromCookies || generatedFirstName, // Add both formats for compatibility
            last_name: lastNameFromCookies || '',   // Add both formats for compatibility
            name: firstNameFromCookies && lastNameFromCookies ? `${firstNameFromCookies} ${lastNameFromCookies}` : 
                 (firstNameFromCookies || generatedFirstName || fallbackEmail),
            fullName: firstNameFromCookies && lastNameFromCookies ? `${firstNameFromCookies} ${lastNameFromCookies}` : 
                     (firstNameFromCookies || generatedFirstName || ''),
            businessName: businessNameFromCookies || getCookieValue(cookieHeader, 'businessid') || '',
            businessType: businessTypeFromCookies || '',
            onboardingStatus: getCookieValue(cookieHeader, 'onboardingStatus') || 'complete',
            setupComplete: getCookieValue(cookieHeader, 'setupCompleted') === 'true',
            subscriptionType: getCookieValue(cookieHeader, 'selectedPlan') || 'free',
            subscription_type: getCookieValue(cookieHeader, 'selectedPlan') || 'free', // Both formats
            preferences: {
              theme: 'light',
              notificationsEnabled: true
            },
            fallback: true
          }
        });
      }

      // If we don't have user email or tenant ID and not a dashboard request, return error
      return NextResponse.json({ 
        error: 'No authenticated user found',
        message: 'Please sign in to access your profile' 
      }, { status: 401 });
    }
    
    logger.info(`[API] Creating profile with email: ${userEmail} and tenant ID: ${finalTenantId}`);
    
    // Extract username from email for better defaults
    const username = userEmail ? userEmail.split('@')[0] : '';
    const generatedFirstName = username ? username.charAt(0).toUpperCase() + username.slice(1) : '';
    
    // Return profile data with the tenant ID
    return NextResponse.json({
      profile: {
        id: finalTenantId,
        email: userEmail,
        tenantId: finalTenantId,
        role: 'client',
        firstName: firstNameFromCookies || generatedFirstName,
        lastName: lastNameFromCookies || '',
        name: firstNameFromCookies && lastNameFromCookies ? `${firstNameFromCookies} ${lastNameFromCookies}` : 
             (firstNameFromCookies || generatedFirstName || userEmail),
        fullName: firstNameFromCookies && lastNameFromCookies ? `${firstNameFromCookies} ${lastNameFromCookies}` : 
                 (firstNameFromCookies || generatedFirstName || ''),
        businessName: businessNameFromCookies || '',
        businessType: businessTypeFromCookies || '',
        onboardingStatus: 'incomplete', // Default status
        setupComplete: false,
        subscription_type: 'free',
        preferences: {
          theme: 'light',
          notificationsEnabled: true
        }
      }
    });
  } catch (error) {
    console.error('[API] User profile GET error:', error.message);
    return NextResponse.json({ 
      error: 'Failed to fetch user profile',
      message: error.message 
    }, { status: 500 });
  }
}

/**
 * POST handler for updating user profile
 */
export async function POST(request) {
  console.log('[API] User profile POST request received');
  try {
    // First authenticate the user
    const serverUser = await getServerUser(request);
    if (!serverUser) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be signed in to update your profile'
      }, { status: 401 });
    }
    
    // Get request body
    const profileData = await request.json();
    console.debug('[API] User profile POST data:', profileData);
    
    // Extract the tenantId from the request
    const tenantId = profileData.tenantId || serverUser.sub;
    
    // Return the updated profile (in production this would save to database)
    return NextResponse.json({
      id: serverUser.sub,
      email: serverUser.email,
      ...profileData,
      tenantId: tenantId,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] User profile POST error:', error.message);
    return NextResponse.json({ 
      error: 'Failed to update user profile',
      message: error.message 
    }, { status: 500 });
  }
} 