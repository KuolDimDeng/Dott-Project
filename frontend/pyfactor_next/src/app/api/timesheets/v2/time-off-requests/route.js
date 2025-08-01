/**
 * API Route: Time Off Requests
 * Proxies to backend V2 timesheet API
 */

import { makeBackendRequest } from '@/utils/api';

export async function GET(request) {
  try {
    console.log('🕐 [API] Get time off requests API called');
    
    const response = await makeBackendRequest('/api/timesheets/v2/time-off-requests/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cookies: request.cookies,
    });

    return response;
  } catch (error) {
    console.error('🕐 [API] Get time off requests error:', error);
    return Response.json(
      { error: 'Failed to fetch time off requests' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    console.log('🕐 [API] Create time off request API called');
    
    const body = await request.json();
    console.log('🕐 [API] Time off request body:', body);

    const response = await makeBackendRequest('/api/timesheets/v2/time-off-requests/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cookies: request.cookies,
    });

    return response;
  } catch (error) {
    console.error('🕐 [API] Create time off request error:', error);
    return Response.json(
      { error: 'Failed to create time off request' },
      { status: 500 }
    );
  }
}