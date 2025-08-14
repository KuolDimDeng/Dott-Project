import { NextResponse } from 'next/server';
import { getApiUrl } from '@/utils/api';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid')?.value || cookieStore.get('session_token')?.value;
    
    if (!sessionId) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('time_range') || '1';
    
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/api/analytics/sales-data?time_range=${timeRange}`, {
      headers: {
        'Cookie': `sid=${sessionId}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('Sales data API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch sales data' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in sales-data route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}