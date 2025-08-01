/**
 * API Route: Reject Time Off Request
 * Proxies to backend V2 timesheet API
 */

import { makeBackendRequest } from '@/utils/api';

export async function POST(request, { params }) {
  try {
    console.log('👔 [API] Reject time off request API called for ID:', params.id);
    
    const body = await request.json();
    console.log('👔 [API] Reject time off request body:', body);

    const response = await makeBackendRequest(`/api/timesheets/v2/time-off-requests/${params.id}/reject/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cookies: request.cookies,
    });

    return response;
  } catch (error) {
    console.error('👔 [API] Reject time off request error:', error);
    return Response.json(
      { error: 'Failed to reject time off request' },
      { status: 500 }
    );
  }
}