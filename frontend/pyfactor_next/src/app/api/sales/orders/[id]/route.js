import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

// Helper function to get session cookie
async function getSessionCookie() {
  const cookieStore = cookies();
  const sidCookie = cookieStore.get('sid');
  return sidCookie;
}

export async function GET(request, { params }) {
  try {
    const { id } = params;
    logger.info(`[Orders API] GET request for order ${id}`);
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Orders API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Forward request to Django backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/sales/orders/${id}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      logger.error('[Orders API] Backend error:', data);
      return NextResponse.json(data, { status: response.status });
    }
    
    logger.info('[Orders API] Successfully fetched order:', id);
    return NextResponse.json(data);
    
  } catch (error) {
    logger.error('[Orders API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    logger.info(`[Orders API] PUT request for order ${id}`);
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Orders API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    
    // Forward request to Django backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/sales/orders/${id}`;
    
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      logger.error('[Orders API] Backend error:', data);
      return NextResponse.json(data, { status: response.status });
    }
    
    logger.info('[Orders API] Order updated successfully:', id);
    return NextResponse.json(data);
    
  } catch (error) {
    logger.error('[Orders API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    logger.info(`[Orders API] DELETE request for order ${id}`);
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Orders API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Forward request to Django backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/sales/orders/${id}`;
    
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
      },
    });
    
    if (!response.ok) {
      const data = await response.json();
      logger.error('[Orders API] Backend error:', data);
      return NextResponse.json(data, { status: response.status });
    }
    
    logger.info('[Orders API] Order deleted successfully:', id);
    return NextResponse.json({ message: 'Order deleted successfully' });
    
  } catch (error) {
    logger.error('[Orders API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}