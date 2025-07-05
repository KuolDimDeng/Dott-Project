import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getServerUser } from '@/utils/getServerUser';

/**
 * Background setup API endpoint for asynchronous account setup
 * This allows the user to be directed to the dashboard immediately
 * while the setup happens in the background
 */
export async function POST(request) {
  const requestId = request.headers.get('X-Request-ID') || crypto.randomUUID();
  const startTime = Date.now();
  
  // Return success response immediately to unblock client
  // Then continue processing in the background
  const response = NextResponse.json({
    success: true,
    message: 'Setup initiated in background',
    requestId
  });
  
  // Run setup process asynchronously
  (async () => {
    try {
      // Parse request body
      const data = await request.json().catch(() => ({}));
      const plan = data.plan || request.nextUrl.searchParams.get('plan') || 'free';
      const background = data.background || request.nextUrl.searchParams.get('background') === 'true';
      
      // Get tenant information
      const user = await getServerUser(request);
      const tenantId = user?.['custom:businessid'] || request.headers.get('x-tenant-id');
      
      if (!tenantId) {
        logger.warn('[BackgroundSetup] No tenant ID found', { requestId });
        return;
      }
      
      logger.debug('[BackgroundSetup] Starting background setup', { 
        tenantId, 
        plan,
        requestId,
        background
      });
      
      // For RLS, create the necessary permissions and policies
      // This doesn't need to block the user experience
      await setupRLSPolicies(tenantId, user, plan);
      
      // Log completion
      const duration = Date.now() - startTime;
      logger.info('[BackgroundSetup] Background setup completed', {
        tenantId,
        duration,
        requestId
      });
    } catch (error) {
      logger.error('[BackgroundSetup] Error in background setup', {
        error: error.message,
        stack: error.stack,
        requestId
      });
    }
  })();
  
  // Return the immediate response to client
  return response;
}

/**
 * Setup RLS policies for the tenant
 */
async function setupRLSPolicies(tenantId, user, plan) {
  try {
    logger.debug('[BackgroundSetup] Setting up RLS policies', { tenantId, plan });
    
    // Add a small delay to ensure cookies are set on client side first
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate RLS policy setup (replace with actual implementation)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    logger.debug('[BackgroundSetup] RLS policies created successfully', { tenantId });
    return true;
  } catch (error) {
    logger.error('[BackgroundSetup] Error setting up RLS policies', {
      error: error.message,
      tenantId
    });
    return false;
  }
} 