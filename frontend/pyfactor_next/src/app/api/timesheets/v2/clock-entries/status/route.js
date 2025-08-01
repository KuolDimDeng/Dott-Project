/**
 * API Route: Clock Entry Status
 * Proxies to backend V2 timesheet API
 */

import { makeBackendRequest } from '@/utils/api';

export async function GET(request) {
  try {
    console.log('🕐 [API] Get clock status API called');
    
    const response = await makeBackendRequest('/api/timesheets/v2/clock-entries/status/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cookies: request.cookies,
    });

    return response;
  } catch (error) {
    console.error('🕐 [API] Get clock status error:', error);
    return Response.json(
      { error: 'Failed to fetch clock status' },
      { status: 500 }
    );
  }
}