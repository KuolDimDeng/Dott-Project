/**
 * API Route: Clock Out
 * Proxies to backend V2 timesheet API
 */

import { makeRequest } from '@/utils/api';

export async function POST(request) {
  try {
    console.log('🕐 [API] Clock out API called');
    
    const body = await request.json();
    console.log('🕐 [API] Clock out request body:', body);

    const response = await makeRequest('/api/timesheets/v2/clock-entries/clock_out/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }, request);

    return Response.json(response);
  } catch (error) {
    console.error('🕐 [API] Clock out error:', error);
    return Response.json(
      { error: 'Failed to clock out' },
      { status: 500 }
    );
  }
}