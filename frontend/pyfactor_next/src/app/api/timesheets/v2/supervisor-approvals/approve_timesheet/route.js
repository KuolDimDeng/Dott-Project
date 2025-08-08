/**
 * API Route: Approve Timesheet
 * Proxies to backend V2 timesheet API
 */

import { makeRequest } from '@/utils/api';

export async function POST(request) {
  try {
    console.log('👔 [API] Approve timesheet API called');
    
    const body = await request.json();
    console.log('👔 [API] Approve timesheet request body:', body);

    const response = await makeRequest('/api/timesheets/v2/supervisor-approvals/approve_timesheet/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // cookies handled by makeRequest
    });

    return Response.json(response);
  } catch (error) {
    console.error('👔 [API] Approve timesheet error:', error);
    return Response.json(
      { error: 'Failed to approve timesheet' },
      { status: 500 }
    );
  }
}