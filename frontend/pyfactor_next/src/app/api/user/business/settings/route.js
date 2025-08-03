import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Construct the proxy URL
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    const proxyUrl = `${baseUrl}/api/proxy/users/api/business/settings`;

    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
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
    
    // Construct the proxy URL
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    const proxyUrl = `${baseUrl}/api/proxy/users/api/business/settings`;

    const response = await fetch(proxyUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
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