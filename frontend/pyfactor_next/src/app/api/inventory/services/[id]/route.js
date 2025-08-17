import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Django backend API URL
const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * GET handler for fetching a specific service by ID
 */
export async function GET(request, { params }) {
  const { id } = params;
  
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
    const response = await fetch(`${DJANGO_API_URL}/api/inventory/services/${id}/`, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Service GET] Backend error:', response.status, errorData);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch service', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Service GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating a service
 */
export async function PUT(request, { params }) {
  const { id } = params;
  
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
    const response = await fetch(`${DJANGO_API_URL}/api/inventory/services/${id}/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Service PUT] Backend error:', response.status, errorData);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to update service', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Service PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update service', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler for partial updates (e.g., activate/deactivate)
 */
export async function PATCH(request, { params }) {
  const { id } = params;
  
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
    const response = await fetch(`${DJANGO_API_URL}/api/inventory/services/${id}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Service PATCH] Backend error:', response.status, errorData);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to update service', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Service PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update service', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler - We'll keep this but it should be used sparingly
 * Prefer deactivating services instead for compliance
 */
export async function DELETE(request, { params }) {
  const { id } = params;
  
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
    const response = await fetch(`${DJANGO_API_URL}/api/inventory/services/${id}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Service DELETE] Backend error:', response.status, errorData);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to delete service', details: errorData },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, message: 'Service deleted successfully' });
  } catch (error) {
    console.error('[Service DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete service', message: error.message },
      { status: 500 }
    );
  }
}