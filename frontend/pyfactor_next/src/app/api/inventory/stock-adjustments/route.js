import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { fetchWithAuth } from '@/utils/api';

// GET /api/inventory/stock-adjustments
export async function GET(request) {
  try {
    logger.info('[API] GET /api/inventory/stock-adjustments');
    
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Forward request to Django backend
    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/stock-adjustments/${queryString ? `?${queryString}` : ''}`;
    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cookies: request.cookies,
    });

    const data = await response.json();
    logger.info(`[API] Stock adjustments fetched: ${data.results?.length || data.length || 0} items`);
    
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[API] Error fetching stock adjustments:', error);
    
    if (error.message?.includes('Not found')) {
      return NextResponse.json({ error: 'Stock adjustments endpoint not found' }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock adjustments' },
      { status: error.status || 500 }
    );
  }
}

// POST /api/inventory/stock-adjustments
export async function POST(request) {
  try {
    const body = await request.json();
    logger.info('[API] POST /api/inventory/stock-adjustments', { items: body.items?.length });
    
    // Forward request to Django backend
    const response = await fetchWithAuth(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/stock-adjustments/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        cookies: request.cookies,
      }
    );

    const data = await response.json();
    logger.info('[API] Stock adjustment created:', data.id);
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error('[API] Error creating stock adjustment:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to create stock adjustment' },
      { status: error.status || 500 }
    );
  }
}