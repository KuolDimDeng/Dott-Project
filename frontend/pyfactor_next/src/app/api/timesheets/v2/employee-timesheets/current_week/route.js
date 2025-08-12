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
    const fullUrl = `${backendUrl}/api/timesheets/v2/employee-timesheets/current_week/`;
    
    console.log('🕐 [API] Making request to:', fullUrl);
    console.log('🕐 [API] Session ID:', sidCookie.value);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
        'Accept': 'application/json',
      },
    });

    console.log('🕐 [API] Backend response status:', response.status);

    // Handle different response statuses appropriately
    if (!response.ok) {
      let errorData;
      let errorMessage;
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
          errorMessage = errorData.error || errorData.detail || `Backend error: ${response.status}`;
        } else {
          errorMessage = await response.text();
        }
      } catch (e) {
        errorMessage = `Backend error: ${response.status}`;
      }
      
      console.error('🕐 [API] Backend error:', response.status, errorMessage);
      
      // Pass through the actual status code from backend
      return Response.json(
        { error: errorMessage },
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