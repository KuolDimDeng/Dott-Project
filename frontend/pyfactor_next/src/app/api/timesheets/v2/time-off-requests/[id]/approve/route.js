/**
 * API Route: Approve Time Off Request
 * Proxies to backend V2 timesheet API
 */

import { makeRequest } from '@/utils/api';

export async function POST(request, { params }) {
  try {
    console.log('👔 [API] Approve time off request API called for ID:', params.id);
    
    const body = await request.json();
    console.log('👔 [API] Approve time off request body:', body);

    const response = await makeRequest(`/api/timesheets/v2/time-off-requests/${params.id}/approve/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // cookies handled by makeRequest
    });

    return Response.json(response);
  } catch (error) {
    console.error('👔 [API] Approve time off request error:', error);
    return Response.json(
      { error: 'Failed to approve time off request' },
      { status: 500 }
    );
  }
}