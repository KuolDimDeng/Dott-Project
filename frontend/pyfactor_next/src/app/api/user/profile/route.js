import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';
import { getServerUser } from '@/utils/getServerUser';
import { cookies } from 'next/headers';
import { getDefaultTenantId } from '@/middleware/dev-tenant-middleware';
import { v4 as uuidv4 } from 'uuid';

/**
 * API endpoint to fetch user profile data
 * 
 * Optimized for RLS architecture to quickly return user information
 * without unnecessary database queries.
 */
export async function GET(req) {
  try {
    // Extract the email and tenantId from query params
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const tenantId = searchParams.get('tenantId');
    
    // Extract tenant ID from headers
    const headerTenantId = req.headers.get('x-tenant-id');
    
    // Extract tenant ID from cookies
    const cookieHeader = req.headers.get('cookie');
    
    // Helper to extract cookies
    const getCookieValue = (cookieHeader, name) => {
      if (!cookieHeader) return null;
      const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
      return match ? decodeURIComponent(match[1]) : null;
    };
    
    const cookieTenantId = getCookieValue(cookieHeader, 'tenantId');
    
    // Extract Cognito ID from cookies which serves as tenant ID
    const cognitoUserMatch = cookieHeader?.match(/CognitoIdentityServiceProvider\.[^.]+\.LastAuthUser=([^;]+)/);
    const cognitoUserId = cognitoUserMatch ? cognitoUserMatch[1] : null;
    
    // Use tenant ID from multiple sources, prioritizing query params, headers, then cookies
    const effectiveTenantId = tenantId || headerTenantId || cookieTenantId || cognitoUserId;
    
    if (effectiveTenantId) {
      console.log(`[API] Using dynamically retrieved tenant ID: ${effectiveTenantId}`);
    } else {
      console.log('[API] No tenant ID found, will attempt to retrieve from user authentication');
    }
    
    // Try to get user from server-side authentication
    const serverUser = await getServerUser(req);
    if (serverUser) {
      logger.info('[API] Retrieved authenticated user from server:', {
        email: serverUser.email,
        userId: serverUser.sub,
        firstName: serverUser.given_name || serverUser.first_name,
        lastName: serverUser.family_name || serverUser.last_name,
        tenantId: effectiveTenantId || serverUser.sub // Use user ID as tenant ID if none provided
      });
      
      // Return authenticated user information with enhanced attribute mapping
      return NextResponse.json({
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
          role: serverUser['custom:role'] || 'client',
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
    }
    
    // Extract email from cookies as fallback
    let authUser = null;
    let businessName = null;
    let businessType = null;
    let firstName = null;
    let lastName = null;
    
    if (cookieHeader) {
      authUser = getCookieValue(cookieHeader, 'authUser');
      businessName = getCookieValue(cookieHeader, 'businessName');
      businessType = getCookieValue(cookieHeader, 'businessType');
      firstName = getCookieValue(cookieHeader, 'firstName') || 
                 getCookieValue(cookieHeader, 'given_name') || 
                 getCookieValue(cookieHeader, 'first_name');
      lastName = getCookieValue(cookieHeader, 'lastName') || 
               getCookieValue(cookieHeader, 'family_name') || 
               getCookieValue(cookieHeader, 'last_name');
    }
    
    // Prepare profile data from Cognito authenticated user and other available data
    const userEmail = serverUser?.email || authUser || getCookieValue('email') || getCookieValue('userEmail');
    const fallbackEmail = userEmail || "";
    
    if (!userEmail || !effectiveTenantId) {
      // Check if this is a dashboard request
      const requestUrl = req.url || '';
      const referer = req.headers.get('referer') || '';
      const isDashboardRequest = 
        referer.includes('/dashboard') || 
        requestUrl.includes('dashboard=true') ||
        req.headers.get('X-Dashboard-Route') === 'true';
      
      if (isDashboardRequest) {
        // For dashboard, use available data and create fallback profile
        const fallbackTenantId = effectiveTenantId || cognitoUserId || getDefaultTenantId();
        
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
            firstName: firstName || generatedFirstName,
            lastName: lastName || '',
            first_name: firstName || generatedFirstName, // Add both formats for compatibility
            last_name: lastName || '',   // Add both formats for compatibility
            name: firstName && lastName ? `${firstName} ${lastName}` : 
                 (firstName || generatedFirstName || fallbackEmail),
            fullName: firstName && lastName ? `${firstName} ${lastName}` : 
                     (firstName || generatedFirstName || ''),
            businessName: businessName || getCookieValue(cookieHeader, 'businessid') || '',
            businessType: businessType || '',
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
    
    logger.info(`[API] Creating profile with email: ${userEmail} and tenant ID: ${effectiveTenantId}`);
    
    // Extract username from email for better defaults
    const username = userEmail ? userEmail.split('@')[0] : '';
    const generatedFirstName = username ? username.charAt(0).toUpperCase() + username.slice(1) : '';
    
    // Return profile data with the tenant ID
    return NextResponse.json({
      profile: {
        id: effectiveTenantId,
        email: userEmail,
        tenantId: effectiveTenantId,
        role: 'client',
        firstName: firstName || generatedFirstName,
        lastName: lastName || '',
        name: firstName && lastName ? `${firstName} ${lastName}` : 
             (firstName || generatedFirstName || userEmail),
        fullName: firstName && lastName ? `${firstName} ${lastName}` : 
                 (firstName || generatedFirstName || ''),
        businessName: businessName || '',
        businessType: businessType || '',
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