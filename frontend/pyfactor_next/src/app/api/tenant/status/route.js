import { NextResponse } from 'next/server';
import { validateServerSession } from '@/utils/serverUtils';
import { logger } from '@/utils/logger';
import { serverAxiosInstance } from '@/lib/axios/serverConfig';

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
    
    // Extract request data
    const body = await request.json();
    const { tenantId: requestTenantId, checkOnly = false, forceSync = false } = body;
    
    // Collect all potential tenant IDs from different sources for consistency check
    const potentialTenantIds = {
      cognito: user.attributes?.['custom:businessid'],
      request: requestTenantId,
      cookie: request.cookies.get('tenantId')?.value,
    };
    
    logger.info('[API] Tenant status check with potential IDs:', {
      cognito: potentialTenantIds.cognito,
      request: potentialTenantIds.request,
      cookie: potentialTenantIds.cookie,
      userId,
      userEmail,
      checkOnly,
      forceSync
    });
    
    // Priority order: Cognito ID > Request ID > Cookie ID
    // CRITICAL: Cognito is the source of truth for tenant ID
    let finalTenantId = potentialTenantIds.cognito || 
                       potentialTenantIds.request || 
                       potentialTenantIds.cookie;
    
    // Log mismatch if there's any inconsistency
    if (potentialTenantIds.cognito && 
        (potentialTenantIds.cognito !== potentialTenantIds.request || 
         potentialTenantIds.cognito !== potentialTenantIds.cookie)) {
      logger.warn('[API] Tenant ID mismatch detected:', {
        cognito: potentialTenantIds.cognito,
        request: potentialTenantIds.request,
        cookie: potentialTenantIds.cookie,
        using: finalTenantId
      });
    }
    
    // If no valid tenant ID is found, generate a deterministic one based on user ID
    if (!finalTenantId) {
      const { v5: uuidv5 } = require('uuid');
      const TENANT_NAMESPACE = '9a551c44-4ade-4f89-b078-0af8be794c23';
      
      // Generate tenant ID deterministically from user ID
      finalTenantId = uuidv5(userId, TENANT_NAMESPACE);
      
      logger.warn('[API] No valid tenant ID found, generating deterministic ID from user ID:', {
        userId,
        generatedId: finalTenantId
      });
      
      // Sync the new tenant ID to Cognito if needed
      if (forceSync || !potentialTenantIds.cognito) {
        try {
          // Update Cognito with this generated ID
          logger.info('[API] Syncing generated tenant ID to Cognito:', finalTenantId);
          
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
            }
          });
          
          logger.info('[API] Successfully synced tenant ID to Cognito');
        } catch (syncError) {
          logger.error('[API] Failed to sync tenant ID to Cognito:', syncError);
        }
      }
    }
    
    // Sync to Cognito if requested or if there's a mismatch
    if (forceSync && potentialTenantIds.cognito !== finalTenantId) {
      try {
        logger.info('[API] Force syncing tenant ID to Cognito:', finalTenantId);
        
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
          }
        });
        
        logger.info('[API] Successfully force synced tenant ID to Cognito');
      } catch (syncError) {
        logger.error('[API] Failed to force sync tenant ID to Cognito:', syncError);
      }
    }
    
    // Check if schema exists by making a request to the backend
    const schemaCheckUrl = '/api/dashboard/check-schema';
    logger.info(`[API] Checking if schema exists for tenant ID: ${finalTenantId}`);
    
    try {
      const schemaCheckResponse = await serverAxiosInstance({
        method: 'POST',
        url: schemaCheckUrl,
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'x-tenant-id': finalTenantId
        },
        data: {
          tenantId: finalTenantId
        }
      });
      
      const schemaExists = schemaCheckResponse.data.exists;
      logger.info(`[API] Schema check result: ${schemaExists ? 'exists' : 'does not exist'}`);
      
      // If only checking schema existence, return now
      if (checkOnly) {
        return NextResponse.json({
          tenantId: finalTenantId,
          schemaExists,
          potentialIds: potentialTenantIds
        });
      }
      
      // Otherwise, proceed with schema setup if needed
      if (!schemaExists) {
        logger.info('[API] Schema does not exist, initiating schema setup');
        
        try {
          // Try different schema setup endpoints with fallbacks
          let schemaSetupResponse;
          
          try {
            // First try the preferred endpoint
            schemaSetupResponse = await serverAxiosInstance({
              method: 'POST',
              url: '/api/dashboard/schema-setup',
              headers: {
                Authorization: `Bearer ${tokens.accessToken}`,
                'x-tenant-id': finalTenantId
              },
              data: {
                tenantId: finalTenantId
              },
              timeout: 30000 // Increase timeout for schema creation
            });
            
            logger.info('[API] Schema setup successful via dashboard endpoint');
          } catch (primaryError) {
            logger.warn('[API] Primary schema setup failed, trying fallback:', primaryError.message);
            
            // Fallback to older endpoint if primary fails
            schemaSetupResponse = await serverAxiosInstance({
              method: 'POST',
              url: '/api/tenant/create',
              headers: {
                Authorization: `Bearer ${tokens.accessToken}`,
                'x-tenant-id': finalTenantId
              },
              data: {
                tenantId: finalTenantId,
                forceMigration: true
              },
              timeout: 30000 // Increase timeout for schema creation
            });
            
            logger.info('[API] Schema setup successful via fallback endpoint');
          }
          
          // Update Cognito attributes to mark onboarding as complete
          try {
            logger.info('[API] Updating Cognito attributes after schema setup');
            
            await serverAxiosInstance({
              method: 'POST',
              url: '/api/user/update-attributes',
              headers: {
                Authorization: `Bearer ${tokens.accessToken}`
              },
              data: {
                attributes: {
                  'custom:businessid': finalTenantId,
                  'custom:onboarding': 'complete',
                  'custom:setupdone': 'true'
                }
              }
            });
            
            logger.info('[API] Successfully updated Cognito onboarding attributes');
          } catch (attributeError) {
            logger.error('[API] Failed to update Cognito attributes:', attributeError);
          }
          
          // Return success response
          const response = NextResponse.json({
            tenantId: finalTenantId,
            schemaExists: true,
            schemaCreated: true,
            message: 'Tenant schema setup completed successfully',
            onboardingComplete: true
          });
          
          // Set cookies for client-side consistency
          response.cookies.set('tenantId', finalTenantId, {
            path: '/',
            maxAge: 60 * 60 * 24 * 30 // 30 days
          });
          
          response.cookies.set('onboardedStatus', 'complete', {
            path: '/',
            maxAge: 60 * 60 * 24 * 30 // 30 days
          });
          
          response.cookies.set('onboardingStep', 'dashboard', {
            path: '/',
            maxAge: 60 * 60 * 24 * 30 // 30 days
          });
          
          return response;
        } catch (setupError) {
          logger.error('[API] Failed to set up schema:', setupError);
          
          return NextResponse.json(
            { 
              error: 'Failed to set up tenant schema',
              message: setupError.message,
              tenantId: finalTenantId,
              clientShouldUpdateCognito: true 
            },
            { status: 500 }
          );
        }
      } else {
        // Schema exists, return success and set cookies for consistency
        const response = NextResponse.json({
          tenantId: finalTenantId,
          schemaExists: true,
          message: 'Tenant schema already exists'
        });
        
        // Set cookies for client-side consistency
        response.cookies.set('tenantId', finalTenantId, {
          path: '/',
          maxAge: 60 * 60 * 24 * 30 // 30 days
        });
        
        return response;
      }
    } catch (error) {
      logger.error('[API] Error checking schema status:', error);
      
      return NextResponse.json(
        { 
          error: 'Failed to check schema status',
          message: error.message,
          tenantId: finalTenantId
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('[API] Error in tenant status endpoint:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
} 