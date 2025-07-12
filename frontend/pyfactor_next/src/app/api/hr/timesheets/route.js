import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    // Get session ID from sid cookie
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = request.headers.get('X-Tenant-ID');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await request.json();

    // Forward to Django backend
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dott-api-y26w.onrender.com';
    const response = await fetch(`${API_URL}/api/hr/timesheets/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('[Timesheet] Create failed:', { status: response.status, error });
      return NextResponse.json({ error: 'Failed to create timesheet' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Timesheet] Create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    // Get session ID from sid cookie
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = request.headers.get('X-Tenant-ID');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const queryParams = new URLSearchParams();
    
    // Forward query parameters
    for (const [key, value] of searchParams) {
      queryParams.append(key, value);
    }

    // Forward to Django backend
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dott-api-y26w.onrender.com';
    const response = await fetch(`${API_URL}/api/hr/timesheets/?${queryParams}`, {
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('[Timesheet] List failed:', { status: response.status, error });
      return NextResponse.json({ error: 'Failed to get timesheets' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Timesheet] List error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}