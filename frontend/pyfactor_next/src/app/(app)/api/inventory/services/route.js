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
      
      // Return proper error message for frontend to handle
      if (response.status === 500) {
        return NextResponse.json(
          { 
            error: 'Service temporarily unavailable', 
            details: 'The service management feature is currently being upgraded. Please try again later.',
            code: 'SERVICE_UNAVAILABLE'
          },
          { status: 503 }
        );
      }
      
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
      { 
        error: 'Service temporarily unavailable', 
        details: 'Unable to connect to the service. Please try again later.',
        code: 'CONNECTION_ERROR'
      },
      { status: 503 }
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
      
      // Return proper error message for frontend to handle
      if (response.status === 500) {
        return NextResponse.json(
          { 
            error: 'Service temporarily unavailable', 
            details: 'The service management feature is currently being upgraded. Please try again later.',
            code: 'SERVICE_UNAVAILABLE'
          },
          { status: 503 }
        );
      }
      
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
      { 
        error: 'Service temporarily unavailable', 
        details: 'Unable to connect to the service. Please try again later.',
        code: 'CONNECTION_ERROR'
      },
      { status: 503 }
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
      
      // Return proper error message for frontend to handle
      if (response.status === 500) {
        return NextResponse.json(
          { 
            error: 'Service temporarily unavailable', 
            details: 'The service management feature is currently being upgraded. Please try again later.',
            code: 'SERVICE_UNAVAILABLE'
          },
          { status: 503 }
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
    console.error('[Services Proxy] Error:', error);
    return NextResponse.json(
      { 
        error: 'Service temporarily unavailable', 
        details: 'Unable to connect to the service. Please try again later.',
        code: 'CONNECTION_ERROR'
      },
      { status: 503 }
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
      
      // Return proper error message for frontend to handle
      if (response.status === 500) {
        return NextResponse.json(
          { 
            error: 'Service temporarily unavailable', 
            details: 'The service management feature is currently being upgraded. Please try again later.',
            code: 'SERVICE_UNAVAILABLE'
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to delete service', details: errorData },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Services Proxy] Error:', error);
    return NextResponse.json(
      { 
        error: 'Service temporarily unavailable', 
        details: 'Unable to connect to the service. Please try again later.',
        code: 'CONNECTION_ERROR'
      },
      { status: 503 }
    );
  }
}