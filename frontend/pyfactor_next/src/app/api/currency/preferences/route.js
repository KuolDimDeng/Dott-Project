import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      console.error('[Currency Preferences API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const backendUrl = `${BACKEND_URL}/api/currency/preferences`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error('[Currency Preferences API] Backend error:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' }, 
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Currency Preferences API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const body = await request.json();
    const backendUrl = `${BACKEND_URL}/api/currency/preferences`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to update preferences' }, 
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Currency Preferences API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
