import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('sid');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const backendUrl = process.env.BACKEND_URL || 'https://api.dottapps.com';
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const response = await fetch(`${backendUrl}/timesheets/time-off-requests/?${queryString}`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sessionCookie.value}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend error:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch time off requests' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in time-off-requests route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}