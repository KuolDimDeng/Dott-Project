import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    logger.info('[Clock API] === CLOCK ACTION START ===');
    
    // Get session ID from sid cookie
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      logger.error('[Clock API] No session cookie found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    logger.info('[Clock API] Request body:', body);

    // Forward to Django backend
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const backendUrl = `${API_URL}/api/timesheets/clock-entries/clock/`;
    
    logger.info('[Clock API] Forwarding to backend:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    logger.info('[Clock API] Backend response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      logger.error('[Clock API] Backend error:', { status: response.status, error });
      return NextResponse.json({ error: 'Clock action failed' }, { status: response.status });
    }

    const data = await response.json();
    logger.info('[Clock API] Backend response data:', data);
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Clock API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}