import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

// Helper function to get session cookie
async function getSessionCookie() {
  const cookieStore = cookies();
  const sidCookie = cookieStore.get('sid');
  return sidCookie;
}

export async function GET(request) {
  try {
    logger.info('[Invoices API] GET request received');
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Invoices API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Forward request to Django backend (Django requires trailing slash)
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/sales/invoices/${queryString ? `?${queryString}` : ''}`;
    logger.info(`[Invoices API] Forwarding to backend: ${backendUrl}`);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Accept': 'application/json',
      },
    });

    const responseText = await response.text();
    logger.info(`[Invoices API] Backend response status: ${response.status}`);
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data, { status: response.status });
    } catch (e) {
      logger.error('[Invoices API] Failed to parse response as JSON:', responseText);
      return new NextResponse(responseText, { 
        status: response.status,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  } catch (error) {
    logger.error('[Invoices API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    logger.info('[Invoices API] POST request received');
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Invoices API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const body = await request.json();
    logger.info('[Invoices API] Request body:', body);
    
    // Forward request to Django backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/sales/invoices/`;
    logger.info(`[Invoices API] Forwarding to backend: ${backendUrl}`);
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    logger.info(`[Invoices API] Backend response status: ${response.status}`);
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data, { status: response.status });
    } catch (e) {
      logger.error('[Invoices API] Failed to parse response as JSON:', responseText);
      return new NextResponse(responseText, { 
        status: response.status,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  } catch (error) {
    logger.error('[Invoices API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}