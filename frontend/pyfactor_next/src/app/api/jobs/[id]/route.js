import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getSessionFromRequest } from '@/utils/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    logger.info('[Jobs API] GET job by id:', id);
    
    // Get session for authentication
    const sessionResult = await getSessionFromRequest(request);
    if (!sessionResult.success) {
      logger.warn('[Jobs API] Authentication failed:', sessionResult.error);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/jobs/${id}/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionResult.data.access_token}`,
        'Content-Type': 'application/json',
        'X-Tenant-ID': sessionResult.data.tenant_id,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('[Jobs API] Backend error:', {
        status: response.status,
        data
      });
      return NextResponse.json(
        { error: data.error || 'Failed to fetch job' },
        { status: response.status }
      );
    }

    logger.info('[Jobs API] Successfully fetched job:', data.job_number);
    return NextResponse.json(data);

  } catch (error) {
    logger.error('[Jobs API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    logger.info('[Jobs API] PUT job by id:', id);
    
    // Get session for authentication
    const sessionResult = await getSessionFromRequest(request);
    if (!sessionResult.success) {
      logger.warn('[Jobs API] Authentication failed:', sessionResult.error);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    logger.info('[Jobs API] Updating job with data:', body);

    const response = await fetch(`${BACKEND_URL}/api/jobs/${id}/`, {
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
      logger.error('[Jobs API] Backend error:', {
        status: response.status,
        data
      });
      return NextResponse.json(
        { error: data.error || 'Failed to update job' },
        { status: response.status }
      );
    }

    logger.info('[Jobs API] Successfully updated job:', data.job_number);
    return NextResponse.json(data);

  } catch (error) {
    logger.error('[Jobs API] PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    logger.info('[Jobs API] DELETE job by id:', id);
    
    // Get session for authentication
    const sessionResult = await getSessionFromRequest(request);
    if (!sessionResult.success) {
      logger.warn('[Jobs API] Authentication failed:', sessionResult.error);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/jobs/${id}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${sessionResult.data.access_token}`,
        'Content-Type': 'application/json',
        'X-Tenant-ID': sessionResult.data.tenant_id,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      logger.error('[Jobs API] Backend error:', {
        status: response.status,
        data
      });
      return NextResponse.json(
        { error: data.error || 'Failed to delete job' },
        { status: response.status }
      );
    }

    logger.info('[Jobs API] Successfully deleted job:', id);
    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('[Jobs API] DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}