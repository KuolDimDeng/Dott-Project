import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * Proxy for inventory location API endpoints
 * Forwards requests to Django backend with proper authentication
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    
    // Get session ID from sid cookie
    const sidCookie = cookieStore.get('sid');
    if (!sidCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Forward request to Django backend
    // Backend will determine tenant from the session
    const response = await fetch(`${API_URL}/api/inventory/locations/`, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Inventory Locations API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = cookies();
    
    // Get session ID from sid cookie
    const sidCookie = cookieStore.get('sid');
    if (!sidCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    
    // Forward request to Django backend
    // Backend will determine tenant from the session
    const response = await fetch(`${API_URL}/api/inventory/locations/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Inventory Locations API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const cookieStore = cookies();
    
    // Get session ID from sid cookie
    const sidCookie = cookieStore.get('sid');
    if (!sidCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Extract location ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const locationId = pathParts[pathParts.length - 1];
    
    if (!locationId || locationId === 'locations') {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }
    
    // Get request body
    const body = await request.json();
    
    // Forward request to Django backend
    const response = await fetch(`${API_URL}/api/inventory/locations/${locationId}/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Inventory Locations API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = cookies();
    
    // Get session ID from sid cookie
    const sidCookie = cookieStore.get('sid');
    if (!sidCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Extract location ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const locationId = pathParts[pathParts.length - 1];
    
    if (!locationId || locationId === 'locations') {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }
    
    // Forward request to Django backend
    const response = await fetch(`${API_URL}/api/inventory/locations/${locationId}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }
    
    // DELETE might return 204 No Content
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Inventory Locations API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}