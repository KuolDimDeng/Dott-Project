// Employee stats API v2 proxy route
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    logger.info('[HR v2 Proxy] GET /api/hr/v2/employees/stats');

    // Get session from cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Unauthorized - No session' },
        { status: 401 }
      );
    }

    // Get tenant ID from headers
    const tenantId = request.headers.get('X-Tenant-ID');
    
    // Build headers for backend request
    const headers = {
      'Authorization': `Session ${sessionId.value}`,
      'Cookie': `session_token=${sessionId.value}`,
      'Content-Type': 'application/json',
    };
    
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }

    // Make request to Django backend
    const backendUrl = `${BACKEND_URL}/api/hr/v2/employees/stats/`;
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    logger.info(`[HR v2 Proxy] Backend response: ${response.status}`);
    
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    logger.error('[HR v2 Proxy] Stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}