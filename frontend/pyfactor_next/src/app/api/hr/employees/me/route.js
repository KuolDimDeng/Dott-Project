import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Forward to Django backend to get the current user's employee record
    const response = await fetch(`${BACKEND_URL}/api/hr/employees/me/`, {
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // If employee record doesn't exist, return 404
      if (response.status === 404) {
        return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
      }
      
      const error = await response.text();
      console.error('[Employee Me] Get failed:', { status: response.status, error });
      return NextResponse.json({ error: 'Failed to get employee info' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Employee Me] Get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}