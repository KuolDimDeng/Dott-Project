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
    logger.info('[Clock API] Request body:', JSON.stringify(body, null, 2));
    
    // Get tenant ID from request headers
    const tenantId = request.headers.get('X-Tenant-ID');
    logger.info('[Clock API] Tenant ID:', tenantId);

    // Forward to Django backend
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const backendUrl = `${API_URL}/api/timesheets/clock-entries/clock/`;
    
    logger.info('[Clock API] Forwarding to backend:', backendUrl);
    logger.info('[Clock API] Session ID:', sidCookie.value);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Tenant-ID': tenantId || '',
      },
      body: JSON.stringify(body),
    });

    logger.info('[Clock API] Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[Clock API] Backend error:', { 
        status: response.status, 
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // Try to parse the error as JSON if possible
      let errorMessage = 'Clock action failed';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.detail || errorMessage;
      } catch (e) {
        // If not JSON, use the text
        errorMessage = errorText || errorMessage;
      }
      
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    const data = await response.json();
    logger.info('[Clock API] Backend response data:', data);
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Clock API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}