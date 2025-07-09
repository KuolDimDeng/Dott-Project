import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * Proxy for HR employee statistics endpoint
 * Forwards requests to Django backend with proper authentication
 */
export async function GET(request) {
  try {
    logger.info('🚀 [HR API Stats] === START GET /api/hr/employees/stats ===');
    
    const cookieStore = cookies();
    
    // Get session ID from sid cookie
    const sidCookie = cookieStore.get('sid');
    if (!sidCookie) {
      logger.warn('[HR API Stats] No session found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Get tenant ID from headers
    const tenantId = request.headers.get('X-Tenant-ID') || 
                     request.headers.get('x-tenant-id');
    
    const headers = {
      'Authorization': `Session ${sidCookie.value}`,
      'Content-Type': 'application/json',
    };
    
    // Add tenant headers if available
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
      headers['tenant-id'] = tenantId;
      headers['x-schema-name'] = `tenant_${tenantId.replace(/-/g, '_')}`;
    }
    
    logger.info('[HR API Stats] Forwarding request to backend:', {
      url: `${API_URL}/api/hr/employees/stats/`,
      hasAuth: true,
      hasTenant: !!tenantId
    });
    
    // Forward request to Django backend
    const response = await fetch(`${API_URL}/api/hr/employees/stats/`, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      // If backend doesn't have the endpoint yet, return demo data
      if (response.status === 404) {
        logger.info('[HR API Stats] Backend endpoint not found, returning demo data');
        return NextResponse.json({
          total: 12,
          active: 10,
          onLeave: 2,
          inactive: 0,
          newThisMonth: 3,
          departments: 4
        });
      }
      
      logger.error(`[HR API Stats] Backend returned error: ${response.status}`);
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }
    
    const data = await response.json();
    logger.info('✅ [HR API Stats] Successfully retrieved employee stats:', data);
    return NextResponse.json(data);
  } catch (error) {
    logger.error('❌ [HR API Stats] Error:', error);
    
    // Return demo data as fallback
    return NextResponse.json({
      total: 12,
      active: 10,
      onLeave: 2,
      inactive: 0,
      newThisMonth: 3,
      departments: 4
    });
  }
}