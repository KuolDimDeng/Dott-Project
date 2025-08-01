/**
 * API Route: Get Current Week Employee Timesheet
 * Proxies to backend V2 timesheet API
 */

import { makeBackendRequest } from '@/utils/api';

export async function GET(request) {
  try {
    console.log('🕐 [API] Current week timesheet API called');
    
    const response = await makeBackendRequest('/api/timesheets/v2/employee-timesheets/current_week/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cookies: request.cookies,
    });

    return response;
  } catch (error) {
    console.error('🕐 [API] Current week timesheet error:', error);
    return Response.json(
      { error: 'Failed to fetch current week timesheet' },
      { status: 500 }
    );
  }
}