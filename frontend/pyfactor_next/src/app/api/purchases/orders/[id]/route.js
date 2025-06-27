import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request, { params }) {
  const { id } = params;
  logger.info('[PurchaseOrderProxy] Incoming GET request for ID:', id);
  
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      logger.warn('[PurchaseOrderProxy] No session cookie found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const url = `${BACKEND_URL}/api/purchases/purchase-orders/${id}/`;
    logger.info('[PurchaseOrderProxy] Forwarding GET request to:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    logger.info('[PurchaseOrderProxy] Backend response status:', response.status);

    if (!response.ok) {
      logger.error('[PurchaseOrderProxy] Backend error:', responseText);
      return NextResponse.json(
        { error: responseText || `Backend returned ${response.status}` },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[PurchaseOrderProxy] Failed to parse response:', parseError);
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    logger.info('[PurchaseOrderProxy] Successfully fetched purchase order:', id);
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[PurchaseOrderProxy] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  logger.info('[PurchaseOrderProxy] Incoming PUT request for ID:', id);
  
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      logger.warn('[PurchaseOrderProxy] No session cookie found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const body = await request.json();
    logger.info('[PurchaseOrderProxy] Request body:', JSON.stringify(body, null, 2));

    const url = `${BACKEND_URL}/api/purchases/purchase-orders/${id}/`;
    logger.info('[PurchaseOrderProxy] Forwarding PUT request to:', url);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    logger.info('[PurchaseOrderProxy] Backend response status:', response.status);

    if (!response.ok) {
      logger.error('[PurchaseOrderProxy] Backend error:', responseText);
      return NextResponse.json(
        { error: responseText || `Backend returned ${response.status}` },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[PurchaseOrderProxy] Failed to parse response:', parseError);
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    logger.info('[PurchaseOrderProxy] Successfully updated purchase order:', id);
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[PurchaseOrderProxy] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  logger.info('[PurchaseOrderProxy] Incoming DELETE request for ID:', id);
  
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      logger.warn('[PurchaseOrderProxy] No session cookie found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const url = `${BACKEND_URL}/api/purchases/purchase-orders/${id}/`;
    logger.info('[PurchaseOrderProxy] Forwarding DELETE request to:', url);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info('[PurchaseOrderProxy] Backend response status:', response.status);

    if (response.status === 204) {
      logger.info('[PurchaseOrderProxy] Successfully deleted purchase order:', id);
      return new NextResponse(null, { status: 204 });
    }

    const responseText = await response.text();

    if (!response.ok) {
      logger.error('[PurchaseOrderProxy] Backend error:', responseText);
      return NextResponse.json(
        { error: responseText || `Backend returned ${response.status}` },
        { status: response.status }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error('[PurchaseOrderProxy] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}