import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

// Helper function to get session cookie
async function getSessionCookie() {
  const cookieStore = await cookies();
  const sidCookie = cookieStore.get('sid');
  return sidCookie;
}

export async function GET(request) {
  try {
    logger.info('[Orders API] GET request received');
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Orders API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Forward request to Django backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/sales/orders${queryString ? `?${queryString}` : ''}`;
    logger.info('[Orders API] Forwarding GET to:', backendUrl);
    
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
    
    logger.info('[Orders API] Successfully fetched orders');
    return NextResponse.json(data);
    
  } catch (error) {
    logger.error('[Orders API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    logger.info('[Orders API] POST request received');
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Orders API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    logger.info('[Orders API] Creating order with data:', body);
    
    // Forward request to Django backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/sales/orders`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
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
    
    logger.info('[Orders API] Order created successfully:', data);
    return NextResponse.json(data, { status: 201 });
    
  } catch (error) {
    logger.error('[Orders API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}