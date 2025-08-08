/**
 * API Route: Clock In
 * Proxies to backend V2 timesheet API
 */

import { makeRequest } from '@/utils/api';

export async function POST(request) {
  try {
    console.log('🕐 [API] Clock in API called');
    
    const body = await request.json();
    console.log('🕐 [API] Clock in request body:', body);

    const response = await makeRequest('/api/timesheets/v2/clock-entries/clock_in/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // cookies handled by makeRequest
    });

    return Response.json(response);
  } catch (error) {
    console.error('🕐 [API] Clock in error:', error);
    return Response.json(
      { error: 'Failed to clock in' },
      { status: 500 }
    );
  }
}