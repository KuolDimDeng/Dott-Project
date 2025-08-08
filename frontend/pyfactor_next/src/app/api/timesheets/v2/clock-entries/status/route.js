/**
 * API Route: Clock Entry Status
 * Proxies to backend V2 timesheet API
 */

import { makeRequest } from '@/utils/api';

export async function GET(request) {
  try {
    console.log('🕐 [API] Get clock status API called');
    
    const response = await makeRequest('/api/timesheets/v2/clock-entries/status/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // cookies handled by makeRequest
    });

    return Response.json(response);
  } catch (error) {
    console.error('🕐 [API] Get clock status error:', error);
    return Response.json(
      { error: 'Failed to fetch clock status' },
      { status: 500 }
    );
  }
}