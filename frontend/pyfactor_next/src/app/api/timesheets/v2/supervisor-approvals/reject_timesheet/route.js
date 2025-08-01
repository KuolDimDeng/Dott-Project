/**
 * API Route: Reject Timesheet
 * Proxies to backend V2 timesheet API
 */

import { makeBackendRequest } from '@/utils/api';

export async function POST(request) {
  try {
    console.log('👔 [API] Reject timesheet API called');
    
    const body = await request.json();
    console.log('👔 [API] Reject timesheet request body:', body);

    const response = await makeBackendRequest('/api/timesheets/v2/supervisor-approvals/reject_timesheet/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cookies: request.cookies,
    });

    return response;
  } catch (error) {
    console.error('👔 [API] Reject timesheet error:', error);
    return Response.json(
      { error: 'Failed to reject timesheet' },
      { status: 500 }
    );
  }
}