import { NextResponse } from 'next/server';
import { validateServerSession } from '@/utils/serverUtils';
import { logger } from '@/utils/logger';
import { serverAxiosInstance } from '@/lib/axios/serverConfig';

/**
 * API endpoint that triggers schema setup with robust error handling
 * This is designed to be more reliable when backend connectivity is unreliable
 */
export async function POST(request) {
  try {
    // Validate server session
    const sessionValidation = await validateServerSession();
    if (!sessionValidation.user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }
    
    const { user, tokens } = sessionValidation;
    const userId = user.sub || user.userId;
    const userEmail = user.email;
    
    // Extract tenant ID from Cognito (source of truth)
    const cognitoTenantId = user.attributes?.['custom:businessid'];
    
    logger.info('[API] Trigger schema setup called for user:', {
      userId,
      email: userEmail,
      cognitoTenantId
    });
    
    // If no Cognito tenant ID, attempt to generate one
    let finalTenantId = cognitoTenantId;
    if (!finalTenantId) {
      // Generate deterministic tenant ID from user ID
      const { v5: uuidv5 } = require('uuid');
      const TENANT_NAMESPACE = '9a551c44-4ade-4f89-b078-0af8be794c23';
      finalTenantId = uuidv5(userId, TENANT_NAMESPACE);
      
      logger.info('[API] Generated tenant ID from user ID:', finalTenantId);
      
      // Update Cognito with this generated ID
      try {
        await serverAxiosInstance({
          method: 'POST',
          url: '/api/user/update-attributes',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`
          },
          data: {
            attributes: {
              'custom:businessid': finalTenantId
            }
          },
          timeout: 5000
        });
        
        logger.info('[API] Updated Cognito with generated tenant ID');
      } catch (updateError) {
        logger.error('[API] Failed to update Cognito with tenant ID:', updateError);
        // Continue with the generated ID even if update fails
      }
    }
    
    // Prepare headers for backend requests
    const headers = {
      Authorization: `Bearer ${tokens.accessToken}`,
      'X-Tenant-ID': finalTenantId
    };
    
    // Log current Cognito attributes for debugging
    logger.info('[API] Current Cognito attributes:', {
      businessId: finalTenantId,
      onboarding: user.attributes?.['custom:onboarding'],
      setupDone: user.attributes?.['custom:setupdone']
    });
    
    // Try multiple schema setup approaches with fallbacks
    let setupSuccess = false;
    let setupError = null;
    let setupResponse = null;
    
    // First approach: Try schema setup via dashboard endpoint
    try {
      logger.info('[API] Attempting schema setup via dashboard endpoint');
      
      setupResponse = await serverAxiosInstance({
        method: 'POST',
        url: '/api/dashboard/schema-setup',
        headers,
        data: {
          tenantId: finalTenantId,
          userId,
          email: userEmail
        },
        timeout: 30000 // Longer timeout for schema setup
      });
      
      logger.info('[API] Schema setup successful via dashboard endpoint:', setupResponse.data);
      setupSuccess = true;
    } catch (error) {
      setupError = error;
      logger.warn('[API] Dashboard schema setup failed:', error.message);
      
      // Second approach: Try schema setup via tenant create endpoint
      try {
        logger.info('[API] Attempting schema setup via tenant create endpoint');
        
        setupResponse = await serverAxiosInstance({
          method: 'POST',
          url: '/api/tenant/create',
          headers,
          data: {
            tenantId: finalTenantId,
            forceMigration: true
          },
          timeout: 30000
        });
        
        logger.info('[API] Schema setup successful via tenant create endpoint:', setupResponse.data);
        setupSuccess = true;
      } catch (fallbackError) {
        logger.error('[API] Fallback schema setup also failed:', fallbackError.message);
        setupError = fallbackError;
        
        // Third approach: Use dedicated tenant record creation endpoint
        try {
          logger.info('[API] Attempting dedicated tenant record creation endpoint');
          
          // Use our specialized endpoint that focuses solely on tenant record creation
          const tenantRecordResponse = await fetch(new URL('/api/tenant/create-tenant-record', request.url).toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tokens.accessToken}`,
              'X-Id-Token': tokens.idToken.toString()
            },
            body: JSON.stringify({
              tenantId: finalTenantId,
              userId,
              email: userEmail,
              businessName: user.attributes?.['custom:businessname'] || 'My Business'
            })
          });
          
          const tenantRecordResult = await tenantRecordResponse.json();
          logger.info('[API] Tenant record creation attempt result:', tenantRecordResult);
          
          if (tenantRecordResponse.ok && tenantRecordResult.success) {
            logger.info('[API] Tenant record creation successful');
            setupResponse = { data: tenantRecordResult };
            setupSuccess = true;
          } else {
            logger.error('[API] Tenant record creation failed:', tenantRecordResult);
            
            // Fallback to original direct database approach
            try {
              logger.info('[API] Falling back to legacy direct database approach as last resort');
              
              const directDbResponse = await fetch(new URL('/api/tenant/init', request.url).toString(), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${tokens.accessToken}`,
                  'X-Id-Token': tokens.idToken.toString()
                },
                body: JSON.stringify({
                  tenantId: finalTenantId,
                  userId,
                  email: userEmail,
                  businessName: user.attributes?.['custom:businessname'] || 'My Business'
                })
              });
              
              if (directDbResponse.ok) {
                const directDbResult = await directDbResponse.json();
                logger.info('[API] Direct database tenant creation successful:', directDbResult);
                setupResponse = { data: directDbResult };
                setupSuccess = true;
              } else {
                const errorText = await directDbResponse.text().catch(() => 'Unknown error');
                logger.error('[API] Direct database approach failed:', errorText);
              }
            } catch (directDbError) {
              logger.error('[API] Error with direct database approach:', directDbError);
            }
          }
        } catch (recordCreationError) {
          logger.error('[API] Error with tenant record creation:', recordCreationError);
        }
      }
    }
    
    // Always update Cognito attributes regardless of backend success
    // This allows the client to function even if the backend is temporarily down
    try {
      logger.info('[API] Updating Cognito attributes regardless of backend status');
      
      await serverAxiosInstance({
        method: 'POST',
        url: '/api/user/update-attributes',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`
        },
        data: {
          attributes: {
            'custom:businessid': finalTenantId,
            'custom:onboarding': 'COMPLETE',
            'custom:setupdone': 'true',
            'custom:updated_at': new Date().toISOString()
          }
        },
        timeout: 5000
      });
      
      logger.info('[API] Successfully updated Cognito attributes');
    } catch (attributeError) {
      logger.error('[API] Failed to update Cognito attributes:', attributeError);
    }
    
    // Build response based on setup success/failure
    let responseStatus = setupSuccess ? 200 : 500;
    let responseBody = {
      tenantId: finalTenantId,
      cognitoUpdated: true,
      schemaCreated: setupSuccess
    };
    
    if (setupSuccess) {
      responseBody.message = 'Schema setup completed successfully';
      responseBody.data = setupResponse?.data;
    } else {
      responseBody.error = 'Schema setup failed';
      responseBody.message = setupError?.message;
      responseBody.clientShouldUpdateCognito = true;
    }
    
    // Build response with cookies
    const response = NextResponse.json(responseBody, { status: responseStatus });
    
    // Set cookies for client-side consistency
    const cookieMaxAge = 60 * 60 * 24 * 30; // 30 days
    
    response.cookies.set('tenantId', finalTenantId, {
      path: '/',
      maxAge: cookieMaxAge
    });
    
    response.cookies.set('onboardedStatus', 'COMPLETE', {
      path: '/',
      maxAge: cookieMaxAge
    });
    
    response.cookies.set('onboardingStep', 'dashboard', {
      path: '/',
      maxAge: cookieMaxAge
    });
    
    return response;
  } catch (error) {
    logger.error('[API] Error in trigger schema setup endpoint:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
} 