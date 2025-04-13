import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * GET endpoint as a fallback method to retrieve tenant ID when client-side methods fail
 * Uses server-side logic to determine the most likely tenant ID
 */
export async function GET(request) {
  try {
    logger.debug('[Tenant Fallback API] Processing fallback tenant ID request');
    
    // Check for tenant ID in request headers (set by middleware)
    const tenantIdFromHeader = request.headers.get('x-tenant-id');
    
    if (tenantIdFromHeader) {
      logger.info('[Tenant Fallback API] Found tenant ID in request headers:', tenantIdFromHeader);
      return NextResponse.json({
        success: true,
        tenantId: tenantIdFromHeader,
        source: 'request_header'
      });
    }
    
    // Try to extract tenant ID from URL
    const url = new URL(request.url);
    const urlPath = url.pathname;
    
    // Extract tenant ID from URL path if present
    // Pattern: /<tenant-id>/...
    const urlPathMatch = urlPath.match(/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i);
    
    if (urlPathMatch && urlPathMatch[1]) {
      const tenantIdFromUrl = urlPathMatch[1];
      logger.info('[Tenant Fallback API] Found tenant ID in URL path:', tenantIdFromUrl);
      
      return NextResponse.json({
        success: true,
        tenantId: tenantIdFromUrl,
        source: 'url_path'
      });
    }
    
    // Check for tenant ID in query parameters
    const tenantIdFromQuery = url.searchParams.get('tenantId');
    
    if (tenantIdFromQuery) {
      logger.info('[Tenant Fallback API] Found tenant ID in query parameters:', tenantIdFromQuery);
      return NextResponse.json({
        success: true,
        tenantId: tenantIdFromQuery,
        source: 'query_parameter'
      });
    }
    
    // No tenant ID found in any of the expected places
    logger.warn('[Tenant Fallback API] No tenant ID found in request');
    
    return NextResponse.json({
      success: false,
      message: 'No tenant ID found',
      source: 'fallback_api'
    }, { status: 404 });
  } catch (error) {
    logger.error('[Tenant Fallback API] Error in fallback tenant ID retrieval:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error retrieving tenant ID',
      message: error.message
    }, { status: 500 });
  }
} 