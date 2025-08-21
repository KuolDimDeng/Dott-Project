import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://api.dottapps.com';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Forward to Django backend
    const response = await fetch(`${BACKEND_URL}/api/hr/employees/${id}/banking/`, {
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Employee Banking] Get failed:', { status: response.status, error });
      return NextResponse.json({ error: 'Failed to get banking info' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Employee Banking] Get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const body = await request.json();

    // Forward to Django backend
    const response = await fetch(`${BACKEND_URL}/api/hr/employees/${id}/banking/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Employee Banking] Update failed:', { status: response.status, error });
      return NextResponse.json({ error: 'Failed to update banking info' }, { status: response.status });
    }

    const data = await response.json();
    console.log('[Employee Banking] Update successful');
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Employee Banking] Update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}