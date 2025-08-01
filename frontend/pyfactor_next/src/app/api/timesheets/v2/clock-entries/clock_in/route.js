/**
 * API Route: Clock In
 * Proxies to backend V2 timesheet API
 */

import { makeBackendRequest } from '@/utils/api';

export async function POST(request) {
  try {
    console.log('🕐 [API] Clock in API called');
    
    const body = await request.json();
    console.log('🕐 [API] Clock in request body:', body);

    const response = await makeBackendRequest('/api/timesheets/v2/clock-entries/clock_in/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cookies: request.cookies,
    });

    return response;
  } catch (error) {
    console.error('🕐 [API] Clock in error:', error);
    return Response.json(
      { error: 'Failed to clock in' },
      { status: 500 }
    );
  }
}