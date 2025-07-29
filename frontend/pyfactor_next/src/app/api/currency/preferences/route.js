import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid')?.value;

    const response = await fetch(`${process.env.BACKEND_URL}/api/users/api/currency/preferences/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionId ? `sid=${sessionId}` : '',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to fetch currency preferences' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching currency preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid')?.value;
    const body = await request.json();
    
    console.log('[Currency Proxy] PUT request received');
    console.log('[Currency Proxy] Session ID:', sessionId);
    console.log('[Currency Proxy] Request body:', body);

    const backendUrl = `${process.env.BACKEND_URL}/api/users/api/currency/preferences/`;
    console.log('[Currency Proxy] Backend URL:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionId ? `sid=${sessionId}` : '',
      },
      body: JSON.stringify(body),
    });

    console.log('[Currency Proxy] Response status:', response.status);
    const data = await response.json();
    console.log('[Currency Proxy] Response data:', data);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to update currency preferences' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating currency preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}