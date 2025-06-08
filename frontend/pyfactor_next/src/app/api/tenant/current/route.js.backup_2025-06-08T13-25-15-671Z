import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverAuth';
import { isValidUUID } from '@/utils/tenantUtils';

/**
 * API endpoint to get the current user's tenant information
 * Uses proper session validation instead of server-side Cognito calls
 */
export async function GET(request) {
  try {
    logger.debug('[API] Getting current tenant information');
    
    // Validate the server session
    const sessionData = await validateServerSession(request);
    
    if (!sessionData.verified || !sessionData.user) {
      logger.warn('[API] Session validation failed for tenant request:', sessionData.error);
      return NextResponse.json(
        { 
          error: 'Authentication required',
          message: sessionData.error || 'Session validation failed'
        },
        { status: 401 }
      );
    }
    
    const { user } = sessionData;
    const userAttributes = user.attributes || {};
    
    // Extract tenant ID with proper priority
    const tenantId = 
      userAttributes['custom:tenant_ID'] ||
      userAttributes['custom:tenantId'] ||
      userAttributes['custom:businessid'] ||
      userAttributes['custom:tenant_id'] ||
      null;
    
    if (!tenantId) {
      logger.warn('[API] No tenant ID found in user attributes');
      return NextResponse.json(
        { 
          error: 'No tenant associated with user',
          userId: user.userId 
        },
        { status: 404 }
      );
    }
    
    // Validate tenant ID format
    if (!isValidUUID(tenantId)) {
      logger.warn(`[API] Invalid tenant ID format: ${tenantId}`);
      return NextResponse.json(
        { 
          error: 'Invalid tenant ID format',
          tenantId 
        },
        { status: 400 }
      );
    }
    
    // Return tenant information
    const tenantInfo = {
      tenantId,
      userId: user.userId,
      businessName: userAttributes['custom:businessname'] || '',
      businessType: userAttributes['custom:businesstype'] || '',
      userRole: userAttributes['custom:userrole'] || 'user',
      subscriptionStatus: userAttributes['custom:subscriptionstatus'] || 'pending',
      setupDone: userAttributes['custom:setupdone'] === 'TRUE' || userAttributes['custom:setupdone'] === 'true'
    };
    
    logger.info(`[API] Current tenant retrieved: ${tenantId} for user ${user.userId}`);
    
    return NextResponse.json({
      tenant: tenantInfo,
      source: 'session'
    });
    
  } catch (error) {
    logger.error('[API] Error getting current tenant:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get current tenant',
        message: error.message 
      },
      { status: 500 }
    );
  }
} 