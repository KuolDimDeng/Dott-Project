import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getSessionFromRequest } from '@/utils/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    logger.info('[Vehicles API] GET request for vehicle:', id);
    
    // Get session for authentication
    const sessionResult = await getSessionFromRequest(request);
    if (!sessionResult.success) {
      logger.warn('[Vehicles API] Authentication failed:', sessionResult.error);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const backendUrl = `${BACKEND_URL}/api/vehicles/${id}/`;

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
        { error: data.error || 'Failed to fetch vehicle' },
        { status: response.status }
      );
    }

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

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    logger.info('[Vehicles API] PUT request for vehicle:', id);
    
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
    const backendUrl = `${BACKEND_URL}/api/vehicles/${id}/`;

    logger.info('[Vehicles API] Forwarding to backend:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'PUT',
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
        { error: data.error || 'Failed to update vehicle' },
        { status: response.status }
      );
    }

    logger.info('[Vehicles API] Successfully updated vehicle');
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

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    logger.info('[Vehicles API] DELETE request for vehicle:', id);
    
    // Get session for authentication
    const sessionResult = await getSessionFromRequest(request);
    if (!sessionResult.success) {
      logger.warn('[Vehicles API] Authentication failed:', sessionResult.error);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const backendUrl = `${BACKEND_URL}/api/vehicles/${id}/`;

    logger.info('[Vehicles API] Forwarding to backend:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${sessionResult.data.access_token}`,
        'Content-Type': 'application/json',
        'X-Tenant-ID': sessionResult.data.tenant_id,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      logger.error('[Vehicles API] Backend error:', {
        status: response.status,
        data
      });
      return NextResponse.json(
        { error: data.error || 'Failed to delete vehicle' },
        { status: response.status }
      );
    }

    logger.info('[Vehicles API] Successfully deleted vehicle');
    return NextResponse.json({ success: true });
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