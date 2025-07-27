import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getSessionFromRequest } from '@/utils/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function GET(request) {
  try {
    logger.info('[Vehicles API] GET request received');
    
    // Get session for authentication
    const sessionResult = await getSessionFromRequest(request);
    if (!sessionResult.success) {
      logger.warn('[Vehicles API] Authentication failed:', sessionResult.error);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}/api/vehicles/${queryString ? `?${queryString}` : ''}`;

    logger.info('[Vehicles API] Forwarding to backend:', backendUrl);

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
      logger.error('[Vehicles API] Backend error:', {
        status: response.status,
        data
      });
      return NextResponse.json(
        { error: data.error || 'Failed to fetch vehicles' },
        { status: response.status }
      );
    }

    logger.info('[Vehicles API] Successfully fetched vehicles:', data.length || 'N/A');
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Vehicles API] Error:', {
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
    logger.info('[Vehicles API] POST request received');
    
    // Get session for authentication
    const sessionResult = await getSessionFromRequest(request);
    if (!sessionResult.success) {
      logger.warn('[Vehicles API] Authentication failed:', sessionResult.error);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const backendUrl = `${BACKEND_URL}/api/vehicles/`;

    logger.info('[Vehicles API] Forwarding to backend:', backendUrl);

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
      logger.error('[Vehicles API] Backend error:', {
        status: response.status,
        data
      });
      return NextResponse.json(
        { error: data.error || 'Failed to create vehicle' },
        { status: response.status }
      );
    }

    logger.info('[Vehicles API] Successfully created vehicle');
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Vehicles API] Error:', {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}