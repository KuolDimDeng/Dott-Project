import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function GET(request) {
  try {
    logger.info('[Jobs API] GET request received');
    
    // Get session data from cookies
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid')?.value;
    
    if (!sessionId) {
      logger.warn('[Jobs API] No session ID found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the session data from the backend
    const sessionResponse = await fetch(`${BACKEND_URL}/api/sessions/verify/`, {
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Content-Type': 'application/json',
      },
    });

    if (!sessionResponse.ok) {
      logger.warn('[Jobs API] Session verification failed');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const sessionData = await sessionResponse.json();
    logger.info('[Jobs API] Session data:', { user_id: sessionData.user_id, tenant_id: sessionData.tenant_id });

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}/api/jobs/${queryString ? `?${queryString}` : ''}`;

    logger.info('[Jobs API] Forwarding to backend:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Content-Type': 'application/json',
        'X-Tenant-ID': sessionData.tenant_id,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('[Jobs API] Backend error:', {
        status: response.status,
        data
      });
      return NextResponse.json(
        { error: data.error || 'Failed to fetch jobs' },
        { status: response.status }
      );
    }

    logger.info('[Jobs API] Successfully fetched jobs:', data.length || 'N/A');
    return NextResponse.json(data);

  } catch (error) {
    logger.error('[Jobs API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    logger.info('[Jobs API] POST request received');
    
    // Get session data from cookies
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid')?.value;
    
    if (!sessionId) {
      logger.warn('[Jobs API] No session ID found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the session data from the backend
    const sessionResponse = await fetch(`${BACKEND_URL}/api/sessions/verify/`, {
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Content-Type': 'application/json',
      },
    });

    if (!sessionResponse.ok) {
      logger.warn('[Jobs API] Session verification failed');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const sessionData = await sessionResponse.json();
    logger.info('[Jobs API] Session data:', { user_id: sessionData.user_id, tenant_id: sessionData.tenant_id });

    const body = await request.json();
    logger.info('[Jobs API] Creating job with data:', body);

    const response = await fetch(`${BACKEND_URL}/api/jobs/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Content-Type': 'application/json',
        'X-Tenant-ID': sessionData.tenant_id,
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
        { error: data.error || 'Failed to create job' },
        { status: response.status }
      );
    }

    logger.info('[Jobs API] Successfully created job:', data.job_number);
    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    logger.error('[Jobs API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}