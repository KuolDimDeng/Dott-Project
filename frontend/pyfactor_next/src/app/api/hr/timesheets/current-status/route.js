import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    logger.info('[Clock Status API] === GET CURRENT STATUS START ===');
    
    // Get session ID from sid cookie
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      logger.error('[Clock Status API] No session cookie found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Forward to Django backend
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const backendUrl = `${API_URL}/api/timesheets/clock-entries/current_status/`;
    
    logger.info('[Clock Status API] Forwarding to backend:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    logger.info('[Clock Status API] Backend response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      logger.error('[Clock Status API] Backend error:', { status: response.status, error });
      return NextResponse.json({ error: 'Failed to get clock status' }, { status: response.status });
    }

    const data = await response.json();
    logger.info('[Clock Status API] Backend response data:', data);
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Clock Status API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}