import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

// Helper function to get session cookie
async function getSessionCookie() {
  const cookieStore = cookies();
  const sidCookie = cookieStore.get('sid');
  return sidCookie;
}

export async function GET(request) {
  try {
    logger.info('[Estimates API] GET request received');
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Estimates API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Forward request to Django backend (Django requires trailing slash)
    const backendUrl = `${BACKEND_URL}/api/sales/estimates/${queryString ? `?${queryString}` : ''}`;
    logger.info('[Estimates API] Forwarding GET to:', backendUrl);
    
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
    
    logger.info('[Estimates API] Successfully fetched estimates');
    return NextResponse.json(data);
    
  } catch (error) {
    logger.error('[Estimates API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch estimates' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    logger.info('[Estimates API] POST request received');
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Estimates API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    logger.info('[Estimates API] Creating estimate with data:', body);
    
    // Transform frontend data to match backend expectations
    const backendData = {
      ...body,
      customer: body.customer_id || body.customer, // Backend expects 'customer' not 'customer_id'
      date: body.estimate_date || body.date,       // Backend expects 'date' not 'estimate_date'
      items: body.items?.map(item => ({
        ...item,
        item_type: item.type || item.item_type || 'product',
        product: item.type === 'product' || item.item_type === 'product' ? (item.item_id || item.product) : null,
        service: item.type === 'service' || item.item_type === 'service' ? (item.item_id || item.service) : null,
        description: item.description || item.name || 'Item',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0
      })) || []
    };
    
    // Remove frontend-specific fields
    delete backendData.customer_id;
    delete backendData.estimate_date;
    
    logger.info('[Estimates API] Transformed data for backend:', backendData);
    
    // Forward request to Django backend (Django requires trailing slash)
    const backendUrl = `${BACKEND_URL}/api/sales/estimates/`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify(backendData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      logger.error('[Estimates API] Backend error:', data);
      return NextResponse.json(data, { status: response.status });
    }
    
    logger.info('[Estimates API] Estimate created successfully:', data);
    return NextResponse.json(data, { status: 201 });
    
  } catch (error) {
    logger.error('[Estimates API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create estimate' },
      { status: 500 }
    );
  }
}