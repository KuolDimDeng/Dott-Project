import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverAuth';
import { serverAxiosInstance } from '@/lib/axiosConfig';

export async function POST(request) {
  try {
    // Get auth session
    let session;
    try {
      session = await validateServerSession();
      logger.debug('[API:TriggerSchemaSetup] Session validated successfully', { 
        hasSession: !!session,
        hasTokens: session?.tokens ? 'yes' : 'no'
      });
    } catch (error) {
      logger.error('[API:TriggerSchemaSetup] Session validation failed', {
        error: error.message
      });
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!session || !session.tokens?.accessToken) {
      logger.error('[API:TriggerSchemaSetup] Missing tokens in session');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Extract user context
    const userId = session.user?.id || session.user?.sub;
    const userEmail = session.user?.email;
    const tenantId = session.user?.attributes?.['custom:businessid'];
    
    // Prepare headers with auth tokens
    const headers = {
      'Authorization': `Bearer ${session.tokens.accessToken}`,
      'X-Id-Token': session.tokens.idToken,
      'Content-Type': 'application/json'
    };
    
    // Add tenant ID if available
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
      const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
      headers['X-Schema-Name'] = schemaName;
    }
    
    // Log current Cognito attributes
    logger.info('[API:TriggerSchemaSetup] Current Cognito attributes:', {
      userId,
      userEmail,
      tenantId,
      onboarding: session.user?.attributes?.['custom:onboarding'],
      setupDone: session.user?.attributes?.['custom:setupdone']
    });
    
    try {
      // Call schema setup endpoint
      logger.debug('[API:TriggerSchemaSetup] Calling schema setup endpoint');
      
      const response = await serverAxiosInstance.post(
        '/api/dashboard/schema-setup',
        {
          tenantId,
          userId,
          userEmail,
          force: true
        },
        { headers }
      );
      
      logger.info('[API:TriggerSchemaSetup] Schema setup triggered successfully:', response.data);
      
      // Explicitly update Cognito attributes regardless of backend success
      // This is critical for ensuring attributes get set even if backend is down
      try {
        logger.info('[API:TriggerSchemaSetup] Explicitly updating Cognito onboarding attributes');
        
        await serverAxiosInstance.post(
          '/api/user/update-attributes',
          {
            attributes: {
              'custom:onboarding': 'complete',
              'custom:setupdone': 'true'
            }
          },
          { headers }
        );
        
        logger.info('[API:TriggerSchemaSetup] Successfully updated Cognito onboarding attributes');
      } catch (attrError) {
        logger.error('[API:TriggerSchemaSetup] Failed to update Cognito attributes via server:', attrError.message);
        // Flag that client should attempt direct update
        response.data.cognitoUpdateFailed = true;
      }
      
      // Create response with cookies for client-side consistency
      const jsonResponse = NextResponse.json({
        ...response.data,
        clientShouldUpdateCognito: true, // Always tell client to double-check
        tenantId,
        userId,
        status: 'success'
      });
      
      // Set onboarding cookies
      jsonResponse.cookies.set('onboardedStatus', 'complete', {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax'
      });
      
      jsonResponse.cookies.set('onboardingStep', 'dashboard', {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax'
      });
      
      // Also set tenant ID cookie
      if (tenantId) {
        jsonResponse.cookies.set('tenantId', tenantId, {
          path: '/',
          maxAge: 60 * 60 * 24 * 30, // 30 days
          sameSite: 'lax'
        });
      }
      
      return jsonResponse;
    } catch (error) {
      logger.error('[API:TriggerSchemaSetup] Error triggering schema setup:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // If server is unreachable, still try to update Cognito attributes
      if (error.message.includes('ECONNREFUSED') || error.code === 'ECONNREFUSED') {
        logger.warn('[API:TriggerSchemaSetup] Backend unreachable, proceeding with Cognito attribute update only');
        
        try {
          // Attempt direct Cognito update with server-side API
          await serverAxiosInstance.post(
            '/api/user/update-attributes',
            {
              attributes: {
                'custom:onboarding': 'complete',
                'custom:setupdone': 'true'
              }
            },
            { headers }
          );
          
          logger.info('[API:TriggerSchemaSetup] Successfully updated Cognito attributes despite backend unreachable');
          
          // Return success with flag for client to verify
          const jsonResponse = NextResponse.json({
            status: 'partial_success',
            message: 'Cognito attributes updated but schema setup may be pending',
            clientShouldUpdateCognito: true,
            backendUnreachable: true,
            tenantId
          });
          
          // Set cookies
          jsonResponse.cookies.set('onboardedStatus', 'complete', {
            path: '/',
            maxAge: 60 * 60 * 24 * 30,
            sameSite: 'lax'
          });
          
          jsonResponse.cookies.set('onboardingStep', 'dashboard', {
            path: '/',
            maxAge: 60 * 60 * 24 * 30,
            sameSite: 'lax'
          });
          
          if (tenantId) {
            jsonResponse.cookies.set('tenantId', tenantId, {
              path: '/',
              maxAge: 60 * 60 * 24 * 30,
              sameSite: 'lax'
            });
          }
          
          return jsonResponse;
        } catch (attrError) {
          logger.error('[API:TriggerSchemaSetup] Failed to update Cognito attributes directly:', attrError.message);
        }
      }
      
      // Extract error details
      const errorMessage = error.response?.data?.message || error.message;
      const errorDetails = error.response?.data || {};
      
      return NextResponse.json({
        error: 'Failed to trigger schema setup',
        message: errorMessage,
        details: errorDetails,
        clientShouldUpdateCognito: true, // Still tell client to try direct update
        status: 'error'
      }, { status: error.response?.status || 500 });
    }
  } catch (error) {
    logger.error('[API:TriggerSchemaSetup] Unexpected error:', {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json({
      error: 'Unexpected error during schema setup trigger',
      message: error.message,
      clientShouldUpdateCognito: true, // Always tell client to try direct update
      status: 'error'
    }, { status: 500 });
  }
} 