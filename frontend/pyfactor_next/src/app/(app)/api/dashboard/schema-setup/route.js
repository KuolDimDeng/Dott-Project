import { NextResponse } from 'next/server';
import { validateServerSession } from '@/utils/serverUtils';
import { logger } from '@/utils/logger';
import { serverAxiosInstance } from '@/lib/axios/serverConfig';
import { withRls, getTenantId } from '@/middleware/rls';

/**
 * API endpoint to trigger tenant schema setup
 * This is a critical endpoint that ensures the tenant schema is properly created
 * and all user attributes are synchronized
 */
const schemaSetupHandler = async (request, context) => {
  try {
    // Get tenant ID from context (set by withRls middleware)
    const tenantIdFromRls = context.tenantId;
    // Force devMode to false to fix dashboard loading issues after onboarding
    const devMode = false;
    
    // Validate server session (skip in development mode)
    let sessionValidation;
    if (!devMode) {
      sessionValidation = await validateServerSession();
      if (!sessionValidation.user) {
        return NextResponse.json(
          { error: 'Authentication required' }, 
          { status: 401 }
        );
      }
    } else {
      // Create fake session for development mode
      sessionValidation = {
        user: {
          sub: 'dev-user-123',
          userId: 'dev-user-123',
          email: request.headers.get('x-dev-user') || 'dev@example.com',
          attributes: {
            'custom:businessid': tenantIdFromRls,
            'custom:onboarding': 'business-info',
            'custom:setupdone': 'FALSE'
          }
        },
        tokens: {
          accessToken: 'dev-token',
          idToken: 'dev-token'
        }
      };
      
      logger.info('[API] Using development mode session for schema setup');
    }
    
    const { user, tokens } = sessionValidation;
    const userId = user.sub || user.userId;
    const userEmail = user.email;
    
    // Log session info for debugging
    logger.info('[API] Schema setup triggered by user:', {
      userId,
      email: userEmail,
      devMode
    });
    
    // Extract request data
    const body = await request.json();
    const { tenantId: requestTenantId, forceCreate = false } = body;
    
    // Get tenant ID - prioritizing in this order:
    // 1. RLS middleware tenant ID (includes dev mode)
    // 2. Cognito tenant ID
    // 3. Request body tenant ID
    const cognitoTenantId = user.attributes?.['custom:businessid'];
    const finalTenantId = tenantIdFromRls || cognitoTenantId || requestTenantId;
    
    if (!finalTenantId) {
      logger.error('[API] No valid tenant ID available for schema setup');
      return NextResponse.json(
        { error: 'No valid tenant ID available' }, 
        { status: 400 }
      );
    }
    
    logger.info('[API] Using tenant ID for schema setup:', finalTenantId);
    
    // Development mode handling for schema setup
    if (devMode) {
      logger.info('[API] Development mode: simulating schema setup for tenant:', finalTenantId);
      
      // Store tenant ID in local storage via response cookies
      const response = NextResponse.json({
        tenantId: finalTenantId,
        schemaCreated: true,
        cognitoUpdated: true,
        message: 'Tenant schema setup completed successfully (DEV MODE)',
        isDevelopment: false
      });
      
      // Set cookies for client-side consistency
      setCookiesOnResponse(response, finalTenantId);
      
      // Also set the development tenant ID cookie
      response.cookies.set('dev-tenant-id', finalTenantId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
      
      return response;
    }
    
    // Prepare request headers including tenant ID and authorization
    const headers = {
      Authorization: `Bearer ${tokens.accessToken}`,
      'X-Tenant-ID': finalTenantId
    };
    
    // Log current Cognito attributes for debugging
    logger.debug('[API] Current Cognito attributes:', {
      businessId: user.attributes?.['custom:businessid'],
      onboarding: user.attributes?.['custom:onboarding'],
      setupDone: user.attributes?.['custom:setupdone']
    });
    
    try {
      // First check if schema already exists to avoid duplicate creation
      if (!forceCreate) {
        try {
          const schemaCheckResponse = await serverAxiosInstance({
            method: 'POST',
            url: '/api/dashboard/check-schema',
            headers,
            data: { tenantId: finalTenantId }
          });
          
          if (schemaCheckResponse.data.exists) {
            logger.info('[API] Schema already exists, skipping creation');
            
            // Even if schema exists, ensure Cognito attributes are set correctly
            await updateCognitoAttributes(tokens.accessToken, finalTenantId);
            
            const response = NextResponse.json({
              tenantId: finalTenantId,
              schemaExists: true,
              message: 'Tenant schema already exists',
              cognitoUpdated: true
            });
            
            // Set cookies for client-side consistency
            setCookiesOnResponse(response, finalTenantId);
            
            return response;
          }
        } catch (checkError) {
          logger.warn('[API] Error checking schema existence:', checkError.message);
          // Continue to schema creation even if check fails
        }
      }
      
      // Initiate schema setup
      logger.info('[API] Initiating schema setup for tenant:', finalTenantId);
      
      const schemaSetupResponse = await serverAxiosInstance({
        method: 'POST',
        url: '/api/dashboard/setup',
        headers,
        data: {
          tenantId: finalTenantId,
          userId: userId,
          email: userEmail
        },
        timeout: 30000 // Longer timeout for schema creation
      });
      
      logger.info('[API] Schema setup response:', schemaSetupResponse.data);
      
      // After successful schema setup, update Cognito attributes
      const cognitoUpdateSuccess = await updateCognitoAttributes(tokens.accessToken, finalTenantId);
      
      // Prepare response
      const response = NextResponse.json({
        tenantId: finalTenantId,
        schemaCreated: true,
        cognitoUpdated: cognitoUpdateSuccess,
        message: 'Tenant schema setup completed successfully',
        data: schemaSetupResponse.data
      });
      
      // Set cookies for client-side consistency
      setCookiesOnResponse(response, finalTenantId);
      
      return response;
    } catch (setupError) {
      logger.error('[API] Schema setup failed:', setupError);
      
      // Try to update Cognito attributes anyway (best effort)
      try {
        await updateCognitoAttributes(tokens.accessToken, finalTenantId);
        logger.info('[API] Updated Cognito attributes despite schema setup failure');
      } catch (cognitoError) {
        logger.error('[API] Failed to update Cognito attributes after schema failure:', cognitoError.message);
      }
      
      return NextResponse.json(
        {
          error: 'Schema setup failed',
          message: setupError.message,
          tenantId: finalTenantId,
          clientShouldUpdateCognito: true,
          cognitoBusinessId: cognitoTenantId
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('[API] Error in schema setup endpoint:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Updates Cognito user attributes after schema setup
 * @param {string} accessToken - User's access token
 * @param {string} tenantId - The tenant ID
 * @returns {Promise<boolean>} Success status
 */
async function updateCognitoAttributes(accessToken, tenantId) {
  try {
    logger.info('[API] Updating Cognito attributes after schema setup');
    
    const response = await serverAxiosInstance({
      method: 'POST',
      url: '/api/user/update-attributes',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      data: {
        attributes: {
          'custom:businessid': tenantId,
          'custom:onboarding': 'complete',
          'custom:setupdone': 'true',
          'custom:updated_at': new Date().toISOString()
        }
      }
    });
    
    logger.info('[API] Successfully updated Cognito attributes:', response.data);
    return true;
  } catch (error) {
    logger.error('[API] Failed to update Cognito attributes:', error);
    return false;
  }
}

/**
 * Sets consistent cookies on the response
 * @param {NextResponse} response - The Next.js response object
 * @param {string} tenantId - The tenant ID to set
 */
function setCookiesOnResponse(response, tenantId) {
  const cookieMaxAge = 60 * 60 * 24 * 30; // 30 days
  
  // Set tenant ID cookie
  response.cookies.set('tenantId', tenantId, {
    path: '/',
    maxAge: cookieMaxAge
  });
  
  // Also set onboarding status cookies
  response.cookies.set('onboardedStatus', 'complete', {
    path: '/',
    maxAge: cookieMaxAge
  });
  
  response.cookies.set('onboardingStep', 'dashboard', {
    path: '/',
    maxAge: cookieMaxAge
  });
}

// Export the handler wrapped with RLS middleware
export const POST = withRls(schemaSetupHandler); 