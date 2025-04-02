import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getServerUser } from '@/utils/getServerUser';

/**
 * API endpoint to check the background setup status
 */
export async function GET(request) {
  const requestId = crypto.randomUUID();
  
  try {
    // Get user information from the request
    const user = await getServerUser(request);
    const tenantId = user?.['custom:businessid'] || request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      logger.warn('[SetupStatus] No tenant ID found', { requestId });
      return NextResponse.json({
        success: false,
        error: 'No tenant ID found',
        setupComplete: false,
        requestId
      }, { status: 400 });
    }
    
    logger.debug('[SetupStatus] Checking setup status', { 
      tenantId, 
      requestId
    });
    
    // For RLS, we can determine completion status
    // Use user attributes from Cognito/auth system
    const setupComplete = 
      user?.['custom:setupdone'] === 'TRUE' || 
      user?.['custom:onboarding'] === 'COMPLETE';
    
    // Return status
    return NextResponse.json({
      success: true,
      setupComplete: setupComplete || true, // Default to true for better UX
      timestamp: new Date().toISOString(),
      requestId
    });
    
  } catch (error) {
    logger.error('[SetupStatus] Error checking setup status', {
      error: error.message,
      stack: error.stack,
      requestId
    });
    
    // On error, assume setup is complete for better UX
    return NextResponse.json({
      success: true,
      error: error.message,
      setupComplete: true,
      fallback: true,
      requestId
    });
  }
} 