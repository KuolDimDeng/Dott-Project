import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';
import { getServerUser } from '@/utils/getServerUser';

/**
 * API endpoint to fetch dashboard metrics summary
 * 
 * This endpoint provides key metrics for the dashboard in a lightweight format,
 * optimized for RLS architecture. It returns placeholder data quickly for
 * initial rendering, which can be replaced with real data as it becomes available.
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
      logger.warn('[Metrics] No tenant ID found', { requestId });
      return NextResponse.json({
        success: false,
        error: 'No tenant ID found',
        requestId
      }, { status: 400 });
    }
    
    logger.debug('[Metrics] Fetching dashboard metrics', { 
      tenantId, 
      requestId,
      isPrefetch
    });
    
    // For RLS, we return placeholder data immediately for fast rendering
    // In a real implementation, you would make efficient queries with RLS policies applied
    
    // Create a response with metrics data
    const response = {
      success: true,
      // Placeholder metrics - in a real implementation, these would come from the database
      metrics: {
        sales: {
          today: { value: 0, change: 0 },
          thisWeek: { value: 0, change: 0 },
          thisMonth: { value: 0, change: 0 },
          pending: { value: 0 }
        },
        invoices: {
          paid: { value: 0, change: 0 },
          unpaid: { value: 0, count: 0 },
          overdue: { value: 0, count: 0 },
          draft: { value: 0, count: 0 }
        },
        expenses: {
          thisMonth: { value: 0, change: 0 },
          pending: { value: 0, count: 0 }
        },
        customers: {
          total: { value: 0 },
          active: { value: 0 },
          new: { value: 0, change: 0 }
        }
      },
      recentActivity: [],
      isPrefetched: isPrefetch,
      isPlaceholder: true, // Flag indicating these are placeholder values
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      requestId
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('[Metrics] Error fetching dashboard metrics', {
      error: error.message,
      stack: error.stack,
      requestId
    });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard metrics',
      message: error.message,
      requestId
    }, { status: 500 });
  }
} 