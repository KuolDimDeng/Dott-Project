/**
 * API Route: Get Pending Timesheets for Supervisor Approval
 * Proxies to backend V2 timesheet API
 */

import { makeBackendRequest } from '@/utils/api';

export async function GET(request) {
  try {
    console.log('👔 [API] Get pending timesheets API called');
    
    const response = await makeBackendRequest('/api/timesheets/v2/supervisor-approvals/pending_timesheets/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cookies: request.cookies,
    });

    return response;
  } catch (error) {
    console.error('👔 [API] Get pending timesheets error:', error);
    return Response.json(
      { error: 'Failed to fetch pending timesheets' },
      { status: 500 }
    );
  }
}