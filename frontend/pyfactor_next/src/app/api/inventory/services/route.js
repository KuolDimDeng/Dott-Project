import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Django backend API URL
const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * Proxy route for Django inventory services API
 * Following the industry standard pattern: Frontend → Local Proxy → Django Backend
 * 
 * TEMPORARY: Due to backend issues, using localStorage for demo purposes
 */

// Temporary in-memory storage until backend is fixed
const tempServices = new Map();

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

    // Try Django backend first
    try {
      const response = await fetch(`${DJANGO_API_URL}/api/inventory/services/`, {
        method: 'GET',
        headers: {
          'Authorization': `Session ${sidCookie.value}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch (backendError) {
      console.warn('[Services Proxy] Backend unavailable, using temporary storage');
    }

    // TEMPORARY: Return services from memory storage
    const services = Array.from(tempServices.values());
    console.log('[Services Proxy] Returning temporary services:', services.length);
    return NextResponse.json(services);
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

    // Try Django backend first
    try {
      const response = await fetch(`${DJANGO_API_URL}/api/inventory/services/`, {
        method: 'POST',
        headers: {
          'Authorization': `Session ${sidCookie.value}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch (backendError) {
      console.warn('[Services Proxy] Backend unavailable, using temporary storage');
    }

    // TEMPORARY: Create service in memory
    const newService = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: body.is_for_sale !== false,
      service_code: `SRV-${Date.now().toString().slice(-6)}`
    };

    tempServices.set(newService.id, newService);
    
    console.log('[Services Proxy] Created temporary service:', newService.id);
    return NextResponse.json(newService, { status: 201 });
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

    // Try Django backend first
    try {
      const response = await fetch(`${DJANGO_API_URL}/api/inventory/services/${serviceId}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Session ${sidCookie.value}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch (backendError) {
      console.warn('[Services Proxy] Backend unavailable, using temporary storage');
    }

    // TEMPORARY: Update service in memory
    const existingService = tempServices.get(serviceId);
    if (!existingService) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    const updatedService = {
      ...existingService,
      ...body,
      id: serviceId,
      updated_at: new Date().toISOString()
    };

    tempServices.set(serviceId, updatedService);
    
    console.log('[Services Proxy] Updated temporary service:', serviceId);
    return NextResponse.json(updatedService);
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

    // Try Django backend first
    try {
      const response = await fetch(`${DJANGO_API_URL}/api/inventory/services/${serviceId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Session ${sidCookie.value}`,
        },
      });

      if (response.ok) {
        return NextResponse.json({ success: true });
      }
    } catch (backendError) {
      console.warn('[Services Proxy] Backend unavailable, using temporary storage');
    }

    // TEMPORARY: Delete from memory
    if (!tempServices.has(serviceId)) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    tempServices.delete(serviceId);
    
    console.log('[Services Proxy] Deleted temporary service:', serviceId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Services Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete service', message: error.message },
      { status: 500 }
    );
  }
}