import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://dott-api-y26w.onrender.com';

export async function GET(request) {
  try {
    console.log('[Payroll Settings] === GET REQUEST START ===');
    
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid');
    
    if (!sid) {
      console.log('[Payroll Settings] No session cookie found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Session ${sid.value}`,
      'X-Session-ID': sid.value,
    };

    const backendUrl = `${BACKEND_URL}/api/payroll/settings/`;
    console.log('[Payroll Settings] Backend URL:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    console.log('[Payroll Settings] Backend response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Payroll Settings] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch payroll settings' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Payroll Settings] Success, returning data');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Payroll Settings] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    console.log('[Payroll Settings] === POST REQUEST START ===');
    
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid');
    
    if (!sid) {
      console.log('[Payroll Settings] No session cookie found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const body = await request.json();
    console.log('[Payroll Settings] Request body:', body);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Session ${sid.value}`,
      'X-Session-ID': sid.value,
    };

    const backendUrl = `${BACKEND_URL}/api/payroll/settings/`;
    console.log('[Payroll Settings] Backend URL:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
    });

    console.log('[Payroll Settings] Backend response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Payroll Settings] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to save payroll settings' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Payroll Settings] Success, returning data');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Payroll Settings] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}