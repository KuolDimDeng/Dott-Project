import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Direct backend call
    const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';
    const backendUrl = `${BACKEND_URL}/users/api/business/settings`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': `sid=${sidCookie.value}`,
      },
      credentials: 'include'
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('[Business Settings API] Backend error:', response.status, responseText);
      return NextResponse.json(
        { error: responseText || 'Failed to fetch business settings' },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[Business Settings API] JSON parse error:', parseError);
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Business Settings API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    
    // Direct backend call
    const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';
    const backendUrl = `${BACKEND_URL}/users/api/business/settings`;

    const response = await fetch(backendUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': `sid=${sidCookie.value}`,
      },
      body: JSON.stringify(body),
      credentials: 'include'
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('[Business Settings API] Backend error:', response.status, responseText);
      return NextResponse.json(
        { error: responseText || 'Failed to update business settings' },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[Business Settings API] JSON parse error:', parseError);
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Business Settings API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}