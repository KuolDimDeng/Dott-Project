import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('sid');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const queryParams = new URLSearchParams(searchParams);
    
    const backendUrl = process.env.BACKEND_URL || 'https://api.dottapps.com';
    
    console.log('[Timesheet Current Week GET] Session ID:', sessionCookie.value);
    console.log('[Timesheet Current Week GET] Backend URL:', backendUrl);
    console.log('[Timesheet Current Week GET] Query params:', queryParams.toString());
    
    const response = await fetch(`${backendUrl}/timesheets/timesheets/current_week/?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sessionCookie.value}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend error:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch current week timesheet' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in current-week GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('sid');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const backendUrl = process.env.BACKEND_URL || 'https://api.dottapps.com';
    
    console.log('[Timesheet Current Week] Session ID:', sessionCookie.value);
    console.log('[Timesheet Current Week] Backend URL:', backendUrl);
    
    const response = await fetch(`${backendUrl}/timesheets/timesheets/current_week/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sessionCookie.value}`,
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend error:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch current week timesheet' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in current-week route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}