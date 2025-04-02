import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';
import { getServerUser } from '@/utils/getServerUser';

/**
 * API endpoint to fetch initial dashboard data
 * 
 * This is an optimized endpoint that returns a minimal set of data
 * needed to render the initial dashboard view.
 */
export async function GET(request) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    // Check if this is a prefetch request
    const isPrefetch = request.headers.get('x-prefetch') === 'true';
    
    // Get user information from the request
    const user = await getServerUser(request);
    const tenantId = user?.['custom:businessid'] || request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      logger.warn('[InitialData] No tenant ID found', { requestId });
      return NextResponse.json({
        success: false,
        error: 'No tenant ID found',
        requestId
      }, { status: 400 });
    }
    
    logger.debug('[InitialData] Fetching initial data', { 
      tenantId, 
      requestId,
      isPrefetch
    });
    
    // For RLS, we can immediately return a minimal response
    // In a real implementation, you would make efficient queries here
    
    // Create a response that contains just enough data for initial rendering
    const response = {
      success: true,
      userData: {
        userName: user?.name || user?.email?.split('@')[0] || 'User',
        email: user?.email || '',
        businessName: user?.['custom:businessname'] || '',
        businessType: user?.['custom:businesstype'] || '',
        onboardingComplete: true
      },
      dashboardMetrics: {
        // Minimal metrics for initial render
        sales: { today: 0, month: 0, pending: 0 },
        invoices: { paid: 0, unpaid: 0, overdue: 0 },
        customers: { active: 0, new: 0 }
      },
      recentActivity: [],
      isPrefetched: isPrefetch,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      requestId
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('[InitialData] Error fetching dashboard data', {
      error: error.message,
      stack: error.stack,
      requestId
    });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch initial dashboard data',
      message: error.message,
      requestId
    }, { status: 500 });
  }
} 