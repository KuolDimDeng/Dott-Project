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
    logger.info(`[Estimates API] GET request for estimate ${id}`);
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Estimates API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Forward request to Django backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/sales/estimates/${id}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      logger.error('[Estimates API] Backend error:', data);
      return NextResponse.json(data, { status: response.status });
    }
    
    logger.info('[Estimates API] Successfully fetched estimate:', id);
    return NextResponse.json(data);
    
  } catch (error) {
    logger.error('[Estimates API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch estimate' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    logger.info(`[Estimates API] PUT request for estimate ${id}`);
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Estimates API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    
    // Forward request to Django backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/sales/estimates/${id}`;
    
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
      logger.error('[Estimates API] Backend error:', data);
      return NextResponse.json(data, { status: response.status });
    }
    
    logger.info('[Estimates API] Estimate updated successfully:', id);
    return NextResponse.json(data);
    
  } catch (error) {
    logger.error('[Estimates API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update estimate' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    logger.info(`[Estimates API] DELETE request for estimate ${id}`);
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Estimates API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Forward request to Django backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/sales/estimates/${id}`;
    
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
      },
    });
    
    if (!response.ok) {
      const data = await response.json();
      logger.error('[Estimates API] Backend error:', data);
      return NextResponse.json(data, { status: response.status });
    }
    
    logger.info('[Estimates API] Estimate deleted successfully:', id);
    return NextResponse.json({ message: 'Estimate deleted successfully' });
    
  } catch (error) {
    logger.error('[Estimates API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete estimate' },
      { status: 500 }
    );
  }
}