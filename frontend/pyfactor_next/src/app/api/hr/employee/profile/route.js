import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export async function GET(request) {
  try {
    console.log('[API Route] GET /api/hr/employee/profile - Starting');
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid')?.value;

    console.log('[API Route] Session ID:', sessionId ? 'Found' : 'Not found');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const backendUrl = `${BACKEND_URL}/api/hr/api/employee/profile/`;
    console.log('[API Route] Fetching from backend:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': `sid=${sessionId}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('[API Route] Backend response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.log('[API Route] Backend error:', errorData);
      return NextResponse.json(
        errorData || { error: 'Failed to fetch employee profile' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[API Route] Employee profile data received:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Error fetching employee profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/hr/api/employee/profile/`, {
      method: 'PATCH',
      headers: {
        'Cookie': `sid=${sessionId}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        errorData || { error: 'Failed to update employee profile' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Error updating employee profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}