/**
 * API Route: Get Current Week Employee Timesheet
 * Proxies to backend V2 timesheet API
 */

import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    console.log('🕐 [API] Current week timesheet API called');
    
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      console.error('🕐 [API] No session cookie found');
      return Response.json({ error: 'No session found' }, { status: 401 });
    }

    // Forward request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/api/timesheets/v2/employee-timesheets/current_week/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });

    console.log('🕐 [API] Backend response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('🕐 [API] Backend error:', response.status, errorData);
      return Response.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('🕐 [API] Successfully fetched timesheet data');
    return Response.json(data);
    
  } catch (error) {
    console.error('🕐 [API] Current week timesheet error:', error);
    return Response.json(
      { error: 'Failed to fetch current week timesheet' },
      { status: 500 }
    );
  }
}