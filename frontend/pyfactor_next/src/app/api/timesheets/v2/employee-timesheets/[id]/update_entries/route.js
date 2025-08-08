/**
 * API Route: Update Employee Timesheet Entries
 * Proxies to backend V2 timesheet API
 */

import { makeRequest } from '@/utils/api';

export async function POST(request, { params }) {
  try {
    console.log('🕐 [API] Update timesheet entries API called for ID:', params.id);
    
    const body = await request.json();
    console.log('🕐 [API] Update entries request body:', body);

    const response = await makeRequest(`/api/timesheets/v2/employee-timesheets/${params.id}/update_entries/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // cookies handled by makeRequest
    });

    return Response.json(response);
  } catch (error) {
    console.error('🕐 [API] Update timesheet entries error:', error);
    return Response.json(
      { error: 'Failed to update timesheet entries' },
      { status: 500 }
    );
  }
}