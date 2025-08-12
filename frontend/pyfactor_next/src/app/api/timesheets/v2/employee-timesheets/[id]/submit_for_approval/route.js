/**
 * API Route: Submit Employee Timesheet for Approval
 * Proxies to backend V2 timesheet API
 */

import { makeRequest } from '@/utils/api';

export async function POST(request, { params }) {
  try {
    console.log('🕐 [API] Submit timesheet for approval API called for ID:', params.id);

    const response = await makeRequest(`/api/timesheets/v2/employee-timesheets/${params.id}/submit_for_approval/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      }, request);

    return Response.json(response);
  } catch (error) {
    console.error('🕐 [API] Submit timesheet for approval error:', error);
    return Response.json(
      { error: 'Failed to submit timesheet for approval' },
      { status: 500 }
    );
  }
}