import { NextResponse } from 'next/server';
import { validateServerSession } from '@/utils/serverUtils';
// Removed AWS Cognito import - now using Auth0
import { logger } from '@/utils/serverLogger';
import { v4 as uuidv4 } from 'uuid';

/**
 * API endpoint to update tenant ID and business ID attributes
 * These attributes require admin privileges to update
 */
export async function POST(request) {
  const requestId = uuidv4().substring(0, 8);
  logger.info(`[API:${requestId}] Update tenant ID request initiated`);
  
  try {
    // Extract the request body
    const body = await request.json();
    const { tenantId, forceUpdate } = body;
    
    // Validate the request
    if (!tenantId) {
      logger.warn(`[API:${requestId}] Missing tenantId in request`);
      return NextResponse.json(
        { error: 'Missing tenantId' },
        { status: 400 }
      );
    }
    
    // Check if this is an onboarding request or dashboard request
    const requestUrl = request.url || '';
    const referer = request.headers.get('referer') || '';
    const isOnboardingRequest = 
      referer.includes('/onboarding/') || 
      requestUrl.includes('onboarding=true') ||
      request.headers.get('X-Onboarding-Route') === 'true';
    
    // Check if this is a dashboard request
    const isDashboardRequest = 
      referer.includes('/dashboard') || 
      requestUrl.includes('dashboard=true') ||
      request.headers.get('X-Dashboard-Route') === 'true';
    
    // Get the authenticated user from the session
    const { user, verified } = await validateServerSession();
    
    // For onboarding or dashboard requests without auth, we'll log a warning but proceed with minimal functionality
    if (!verified && (isOnboardingRequest || isDashboardRequest || forceUpdate)) {
      logger.warn(`[API:${requestId}] Non-authenticated ${isOnboardingRequest ? 'onboarding' : 'dashboard'} tenant ID update - rejecting for security reasons`);
      
      // Return an error response with guidance
      return NextResponse.json({
        success: false,
        error: 'Authentication required for security reasons',
        message: 'Tenant ID changes require authentication. Please sign in again before continuing.',
        context: {
          tenantId: tenantId,
          isOnboardingRequest,
          isDashboardRequest,
          forceUpdate,
          referer: referer.substring(0, 100) // Truncate to avoid logging entire URL
        }
      }, { status: 401 });
    }
    
    // For standard API calls, we require authentication
    if (!verified || !user) {
      logger.warn(`[API:${requestId}] No authenticated user for tenant ID update`);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    logger.info(`[API:${requestId}] Updating tenant ID for user:`, {
      userId: user.sub,
      tenantId: tenantId
    });
    
    // Update user attributes with admin privileges
    try {
      // Also update onboarding status if this is from onboarding
      const attributes = {
        'custom:tenant_ID': tenantId,
        'custom:businessid': tenantId,
        'custom:updated_at': new Date().toISOString()
      };
      
      // If this is coming from onboarding flow, ensure onboarding is marked complete
      if (isOnboardingRequest || referer.includes('freePlan=true') || referer.includes('plan=free')) {
        attributes['custom:onboarding'] = 'complete';
        attributes['custom:setupdone'] = 'true';
        logger.info(`[API:${requestId}] Also updating onboarding status to complete`);
      }
      
      await updateUserAttributesServer(user.sub, attributes);
      
      logger.info(`[API:${requestId}] Successfully updated tenant ID`);
      
      return NextResponse.json({
        success: true,
        message: 'Tenant ID updated successfully'
      });
    } catch (updateError) {
      logger.error(`[API:${requestId}] Failed to update tenant ID:`, {
        error: updateError.message,
        code: updateError.code
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to update tenant ID',
          message: updateError.message
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error(`[API:${requestId}] Error in update-tenant-id:`, error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
} 