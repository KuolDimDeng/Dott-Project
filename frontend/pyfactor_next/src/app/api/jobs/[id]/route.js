import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    logger.info('[Jobs API] GET job by id:', id);
    
    // Get session data from cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid')?.value;
    
    if (!sessionId) {
      logger.warn('[Jobs API] No session ID found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // We don't need to verify session with backend - just forward the request

    const response = await fetch(`${BACKEND_URL}/api/jobs/${id}/`, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Content-Type': 'application/json',
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
    
    // Get session data from cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid')?.value;
    
    if (!sessionId) {
      logger.warn('[Jobs API] No session ID found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // We don't need to verify session with backend - just forward the request

    const body = await request.json();
    logger.info('[Jobs API] Updating job with data:', body);

    const response = await fetch(`${BACKEND_URL}/api/jobs/${id}/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Content-Type': 'application/json',
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
    
    // Get session data from cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid')?.value;
    
    if (!sessionId) {
      logger.warn('[Jobs API] No session ID found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // We don't need to verify session with backend - just forward the request

    const response = await fetch(`${BACKEND_URL}/api/jobs/${id}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Content-Type': 'application/json',
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