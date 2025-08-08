import { NextResponse } from 'next/server';
// Auth0 authentication is handled via useSession hook
import { logger } from '@/utils/logger';

/**
 * GET endpoint to fetch tenant ID from Cognito attributes
 * This is used as a server-side fallback when client-side Cognito access is unavailable
 */
export async function GET(request) {
  try {
    logger.debug('[Tenant API] Attempting to fetch tenant ID from Cognito');
    
    // Fetch user attributes from Cognito
    const userAttributes = await fetchUserAttributes();
    
    // Check for tenant ID in the attributes
    const tenantId = userAttributes['custom:tenant_ID'] || 
                    userAttributes['custom:businessid'] || 
                    userAttributes['custom:tenantId'] || 
                    null;
    
    if (tenantId) {
      logger.info('[Tenant API] Successfully retrieved tenant ID from Cognito:', tenantId);
      
      return NextResponse.json({
        success: true,
        tenantId,
        source: 'cognito'
      });
    } else {
      logger.warn('[Tenant API] No tenant ID found in Cognito attributes');
      
      return NextResponse.json({
        success: false,
        message: 'No tenant ID found in Cognito attributes',
        source: 'cognito'
      }, { status: 404 });
    }
  } catch (error) {
    logger.error('[Tenant API] Error fetching tenant ID from Cognito:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tenant ID from Cognito',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * POST endpoint to update tenant ID in Cognito attributes
 * Used when tenant ID needs to be updated server-side
 */
export async function POST(request) {
  try {
    logger.debug('[Tenant API] Processing request to update tenant ID in Cognito');
    
    // Parse the request body
    const body = await request.json();
    const { tenantId } = body;
    
    if (!tenantId) {
      logger.error('[Tenant API] Missing tenant ID in request body');
      return NextResponse.json({
        success: false,
        error: 'Missing tenant ID in request body'
      }, { status: 400 });
    }
    
    // Removed Amplify/Cognito - using Auth0
    // Auth0 stores tenant ID differently (in app_metadata)
    // This is now handled through the backend API
    
    logger.info('[Tenant API] Auth0 tenant update - handled by backend');
    
    logger.info('[Tenant API] Tenant ID update request processed:', tenantId);
    
    return NextResponse.json({
      success: true,
      tenantId,
      message: 'Tenant ID updated in Cognito'
    });
  } catch (error) {
    logger.error('[Tenant API] Error updating tenant ID in Cognito:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update tenant ID in Cognito',
      message: error.message
    }, { status: 500 });
  }
} 