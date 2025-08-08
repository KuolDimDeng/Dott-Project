/**
 * API Route: Get Pending Time Off Requests for Supervisor Approval
 * Proxies to backend V2 timesheet API
 */

import { makeRequest } from '@/utils/api';

export async function GET(request) {
  try {
    console.log('👔 [API] Get pending time off requests API called');
    
    const response = await makeRequest('/api/timesheets/v2/time-off-requests/pending_approvals/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      }, request);

    return Response.json(response);
  } catch (error) {
    console.error('👔 [API] Get pending time off requests error:', error);
    return Response.json(
      { error: 'Failed to fetch pending time off requests' },
      { status: 500 }
    );
  }
}