import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { isValidUUID } from '@/utils/tenantUtils';
import { cookies } from 'next/headers';

/**
 * API endpoint for fetching user profile data
 * Updated for Auth0 custom domain integration
 */
export async function GET(request) {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    logger.debug(`[UserProfile API] Fetching profile with Auth0 session, request ${requestId}`);
    
    const cookieStore = cookies();
    // Check new session system first
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    // If we have new session cookies, get real user data from backend
    if (sidCookie || sessionTokenCookie) {
      const sessionId = sidCookie?.value || sessionTokenCookie?.value;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
      
      try {
        logger.debug(`[UserProfile API] Using new session system to get real user data, request ${requestId}`);
        
        // Try to get the user data from the backend API
        const response = await fetch(`${API_URL}/api/sessions/current/`, {
          headers: {
            'Authorization': `Session ${sessionId}`,
            'Cookie': `session_token=${sessionId}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        });
        
        if (response.ok) {
          const sessionData = await response.json();
          logger.debug(`[UserProfile API] Backend session data retrieved successfully, request ${requestId}`);
          
          // Try to get additional business/tenant information
          let businessInfo = {};
          if (sessionData.tenant_id) {
            try {
              const businessResponse = await fetch(`${API_URL}/api/tenant/${sessionData.tenant_id}/`, {
                headers: {
                  'Authorization': `Session ${sessionId}`,
                  'Cookie': `session_token=${sessionId}`,
                  'Content-Type': 'application/json'
                },
                cache: 'no-store'
              });
              
              if (businessResponse.ok) {
                const businessData = await businessResponse.json();
                logger.debug(`[UserProfile API] Business data retrieved successfully, request ${requestId}`);
                businessInfo = {
                  businessName: businessData.business_name || businessData.name || '',
                  businessType: businessData.business_type || businessData.type || '',
                  website: businessData.website || '',
                  industry: businessData.industry || '',
                  description: businessData.description || '',
                  taxId: businessData.tax_id || businessData.ein || '',
                  registrationNumber: businessData.registration_number || '',
                  yearEstablished: businessData.year_established || '',
                  address: businessData.address || {},
                  tenant: businessData // Include full tenant data
                };
              }
            } catch (businessError) {
              logger.warn(`[UserProfile API] Could not fetch business data: ${businessError.message}`);
            }
          }
          
          // Transform backend session data to profile format
          const profile = {
            id: sessionData.user_id || sessionData.id,
            email: sessionData.email,
            name: sessionData.name || `${sessionData.first_name || ''} ${sessionData.last_name || ''}`.trim() || sessionData.email,
            firstName: sessionData.first_name || '',
            lastName: sessionData.last_name || '',
            phone_number: sessionData.phone_number || '',
            phoneNumber: sessionData.phone_number || '',
            picture: sessionData.picture,
            profilePhoto: sessionData.picture,
            emailVerified: sessionData.email_verified !== false,
            email_verified: sessionData.email_verified !== false,
            mfa_enabled: sessionData.mfa_enabled || false,
            tenantId: sessionData.tenant_id,
            tenant_id: sessionData.tenant_id,
            businessName: businessInfo.businessName || sessionData.business_name || '',
            businessType: businessInfo.businessType || sessionData.business_type || '',
            business_name: businessInfo.businessName || sessionData.business_name || '',
            business_type: businessInfo.businessType || sessionData.business_type || '',
            website: businessInfo.website || '',
            industry: businessInfo.industry || '',
            description: businessInfo.description || '',
            taxId: businessInfo.taxId || '',
            registrationNumber: businessInfo.registrationNumber || '',
            yearEstablished: businessInfo.yearEstablished || '',
            address: businessInfo.address || {},
            // Add business location from session data (new architecture)
            country: sessionData.business_country || sessionData.country || businessInfo.country || 'US',
            state: sessionData.business_state || sessionData.state || businessInfo.state || '',
            county: sessionData.business_county || sessionData.county || businessInfo.county || '',
            subscriptionPlan: sessionData.subscription_plan || 'free',
            needsOnboarding: sessionData.needs_onboarding || false,
            onboardingCompleted: sessionData.onboarding_completed || true,
            currentStep: sessionData.current_onboarding_step || 'completed',
            role: sessionData.role || 'OWNER',
            permissions: sessionData.permissions || [],
            tenant: businessInfo.tenant || businessInfo, // Include full tenant object
            requestId,
            sessionSource: 'backend-real-data'
          };
          
          logger.debug(`[UserProfile API] Real profile data returned for ${profile.email}, request ${requestId}`);
          return NextResponse.json(profile);
        } else {
          logger.warn(`[UserProfile API] Backend session invalid: ${response.status}, falling back to legacy auth, request ${requestId}`);
          // Fall through to legacy Auth0 session check
        }
      } catch (error) {
        logger.error(`[UserProfile API] Error fetching backend session: ${error.message}, falling back to legacy auth, request ${requestId}`);
        // Fall through to legacy Auth0 session check
      }
    }
    
    if (!sessionCookie) {
      logger.warn(`[UserProfile API] No Auth0 session found, request ${requestId}`);
      return NextResponse.json(
        { 
          error: 'Not authenticated',
          message: 'Authentication required - please sign in again',
          requestId 
        },
        { status: 401 }
      );
    }
    
    // Parse Auth0 session data (legacy)
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (parseError) {
      logger.warn(`[UserProfile API] Invalid session format, request ${requestId}`);
      return NextResponse.json(
        { 
          error: 'Invalid session',
          message: 'Session format is invalid - please sign in again',
          requestId 
        },
        { status: 401 }
      );
    }
    
    if (!sessionData.user) {
      logger.warn(`[UserProfile API] No user data in session, request ${requestId}`);
      return NextResponse.json(
        { 
          error: 'Invalid session',
          message: 'No user data found in session',
          requestId 
        },
        { status: 401 }
      );
    }
    
    const user = sessionData.user;
    
    // Get tenant ID from query parameters or user data
    const url = new URL(request.url);
    const queryTenantId = url.searchParams.get('tenantId');
    
    // Try to get tenant ID from multiple sources
    let tenantId = queryTenantId || 
                   user.tenant_id || 
                   user.tenantId ||
                   user['custom:tenant_ID'] ||
                   user['custom:tenantId'] ||
                   user['custom:businessid'] ||
                   null;
    
    // Also check localStorage values that might be passed via headers
    const xTenantId = request.headers.get('x-tenant-id');
    if (!tenantId && xTenantId) {
      tenantId = xTenantId;
    }
    
    if (tenantId && !isValidUUID(tenantId)) {
      logger.warn(`[UserProfile API] Invalid tenant ID format: "${tenantId}", using null instead`);
      tenantId = null;
    }
    
    // Map Auth0 user data to profile response
    const profile = {
      userId: user.sub,
      email: user.email,
      firstName: user.given_name || user.firstName || '',
      lastName: user.family_name || user.lastName || '',
      tenantId: tenantId,
      businessName: user.businessName || user['custom:businessname'] || '',
      businessType: user.businessType || user['custom:businesstype'] || '',
      legalStructure: user.legalStructure || user['custom:legalstructure'] || '',
      subscriptionPlan: user.subscriptionPlan || user['custom:subplan'] || 'free',
      subscriptionStatus: user.subscriptionStatus || user['custom:subscriptionstatus'] || 'pending',
      onboardingStatus: user.onboardingStatus || user['custom:onboarding'] || 'not_started',
      setupDone: user.setupDone === true || user['custom:setupdone'] === 'TRUE' || user['custom:setupdone'] === 'true',
      currency: user.currency || user['custom:currency'] || 'USD',
      timezone: user.timezone || user['custom:timezone'] || 'America/New_York',
      language: user.language || user['custom:language'] || 'en',
      userRole: user.userRole || user['custom:userrole'] || 'user',
      createdAt: user.createdAt || user['custom:created_at'] || null,
      updatedAt: user.updatedAt || user['custom:updated_at'] || null,
      
      // Auth0 specific fields
      name: user.name,
      nickname: user.nickname,
      picture: user.picture,
      email_verified: user.email_verified,
      updated_at: user.updated_at
    };
    
    // Add flags to help the frontend with state decisions
    profile.isOnboarded = profile.setupDone === true;
    profile.requiresOnboarding = !profile.isOnboarded;
    
    // Determine onboarding progress
    profile.onboardingSteps = {
      businessInfo: Boolean(profile.businessName && profile.businessType),
      subscription: Boolean(profile.subscriptionPlan),
      payment: profile.subscriptionPlan === 'free' || user.paymentVerified === true
    };
    
    logger.info(`[UserProfile API] Profile fetched successfully from Auth0 session for ${profile.email}`);
    
    return NextResponse.json({
      profile,
      source: 'auth0-session',
      requestId
    });
  } catch (error) {
    logger.error(`[UserProfile API] Error fetching profile: ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch profile', 
        message: error.message,
        requestId 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating user profile
 */
export async function PUT(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get session data to get user info
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const sessionResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Cookie': `session_token=${sidCookie.value}`
      },
      cache: 'no-store'
    });
    
    if (!sessionResponse.ok) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const sessionData = await sessionResponse.json();
    const userId = sessionData.auth0_id || sessionData.sub;
    
    if (!userId) {
      logger.error('[Profile API] No Auth0 user ID found in session');
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }
    
    // Get request body
    const body = await request.json();
    const { firstName, lastName, phone_number } = body;
    
    // Validate input
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
    }
    
    // Update Auth0 user profile if Management API credentials are available
    const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'dev-cbyy63jovi6zrcos.us.auth0.com';
    const AUTH0_M2M_CLIENT_ID = process.env.AUTH0_M2M_CLIENT_ID;
    const AUTH0_M2M_CLIENT_SECRET = process.env.AUTH0_M2M_CLIENT_SECRET;
    
    if (AUTH0_M2M_CLIENT_ID && AUTH0_M2M_CLIENT_SECRET) {
      try {
        // Get Auth0 Management API token
        const tokenResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: AUTH0_M2M_CLIENT_ID,
            client_secret: AUTH0_M2M_CLIENT_SECRET,
            audience: `https://${AUTH0_DOMAIN}/api/v2/`,
            grant_type: 'client_credentials'
          })
        });

        if (tokenResponse.ok) {
          const { access_token } = await tokenResponse.json();
          
          const updateData = {
            name: `${firstName} ${lastName}`.trim(),
            given_name: firstName,
            family_name: lastName,
            user_metadata: {
              first_name: firstName,
              last_name: lastName,
              phone_number: phone_number || ''
            }
          };
          
          const auth0Response = await fetch(`https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
          });
          
          if (!auth0Response.ok) {
            const errorData = await auth0Response.json();
            logger.error('[Profile API] Auth0 update failed:', errorData);
          } else {
            logger.info('[Profile API] Auth0 profile updated successfully');
          }
        }
      } catch (auth0Error) {
        logger.error('[Profile API] Auth0 update error:', auth0Error);
        // Continue with backend update
      }
    }
    
    // Update backend profile
    const backendResponse = await fetch(`${API_URL}/api/user/profile/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Cookie': `session_token=${sidCookie.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        name: `${firstName} ${lastName}`.trim(),
        phone_number: phone_number || ''
      })
    });
    
    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      logger.error('[Profile API] Backend update failed:', errorData);
      return NextResponse.json({ 
        error: errorData.error || 'Failed to update profile' 
      }, { status: backendResponse.status });
    }
    
    const updatedProfile = await backendResponse.json();
    
    // Return success
    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    logger.error('[Profile API] Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 