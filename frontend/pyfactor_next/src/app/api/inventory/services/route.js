import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Django backend API URL
const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * Proxy route for Django inventory services API
 * Following the industry standard pattern: Frontend → Local Proxy → Django Backend
 */

export async function GET(request) {
  try {
    // Get session cookie
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Forward request to Django backend
    const response = await fetch(`${DJANGO_API_URL}/api/inventory/services/`, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Services Proxy] Backend error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to fetch services', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Services Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Get session cookie
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();

    // Forward request to Django backend
    const response = await fetch(`${DJANGO_API_URL}/api/inventory/services/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Services Proxy] Backend error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to create service', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Services Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create service', message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Get session cookie
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get service ID from URL
    const url = new URL(request.url);
    const serviceId = url.searchParams.get('id');
    
    if (!serviceId) {
      return NextResponse.json(
        { error: 'Service ID required' },
        { status: 400 }
      );
    }

    // Get request body
    const body = await request.json();

    // Forward request to Django backend
    const response = await fetch(`${DJANGO_API_URL}/api/inventory/services/${serviceId}/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Services Proxy] Backend error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to update service', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Services Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update service', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    // Get session cookie
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get service ID from URL
    const url = new URL(request.url);
    const serviceId = url.searchParams.get('id');
    
    if (!serviceId) {
      return NextResponse.json(
        { error: 'Service ID required' },
        { status: 400 }
      );
    }

    // Forward request to Django backend
    const response = await fetch(`${DJANGO_API_URL}/api/inventory/services/${serviceId}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Services Proxy] Backend error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to delete service', details: errorData },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Services Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete service', message: error.message },
      { status: 500 }
    );
  }
}