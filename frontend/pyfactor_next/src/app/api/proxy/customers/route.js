import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getSessionFromRequest } from '@/utils/auth-server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

/**
 * Proxy API route for /api/customers to handle CORS and authentication
 */
export async function GET(request) {
  try {
    logger.info('[Customers API] GET request received');
    
    // Get session for authentication
    const sessionResult = await getSessionFromRequest(request);
    if (!sessionResult.success) {
      logger.warn('[Customers API] Authentication failed:', sessionResult.error);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}/api/crm/customers/${queryString ? `?${queryString}` : ''}`;

    logger.info('[Customers API] Forwarding to backend:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionResult.data.access_token}`,
        'Content-Type': 'application/json',
        'X-Tenant-ID': sessionResult.data.tenant_id,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('[Customers API] Backend error:', {
        status: response.status,
        data
      });
      return NextResponse.json(
        { error: data.error || 'Failed to fetch customers' },
        { status: response.status }
      );
    }

    // Handle paginated response from backend
    if (data && typeof data === 'object' && 'results' in data) {
      logger.info('[Customers API] Successfully fetched customers:', data.results.length || 0);
      return NextResponse.json(data.results);
    }

    logger.info('[Customers API] Successfully fetched customers:', data.length || 0);
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Customers API] Error:', {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    logger.info('[Customers API] POST request received');
    
    // Get session for authentication
    const sessionResult = await getSessionFromRequest(request);
    if (!sessionResult.success) {
      logger.warn('[Customers API] Authentication failed:', sessionResult.error);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const backendUrl = `${BACKEND_URL}/api/crm/customers/`;

    logger.info('[Customers API] Forwarding to backend:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionResult.data.access_token}`,
        'Content-Type': 'application/json',
        'X-Tenant-ID': sessionResult.data.tenant_id,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('[Customers API] Backend error:', {
        status: response.status,
        data
      });
      return NextResponse.json(
        { error: data.error || 'Failed to create customer' },
        { status: response.status }
      );
    }

    logger.info('[Customers API] Successfully created customer');
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Customers API] Error:', {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 