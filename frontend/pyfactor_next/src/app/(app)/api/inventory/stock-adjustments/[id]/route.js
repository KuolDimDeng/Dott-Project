import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { fetchWithAuth } from '@/utils/api';

// GET /api/inventory/stock-adjustments/[id]
export async function GET(request, { params }) {
  try {
    const { id } = params;
    logger.info(`[API] GET /api/inventory/stock-adjustments/${id}`);
    
    // Forward request to Django backend
    const response = await fetchWithAuth(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/stock-adjustments/${id}/`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cookies: request.cookies,
      }
    );

    const data = await response.json();
    logger.info(`[API] Stock adjustment fetched:`, data.id);
    
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[API] Error fetching stock adjustment:', error);
    
    if (error.message?.includes('Not found')) {
      return NextResponse.json({ error: 'Stock adjustment not found' }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock adjustment' },
      { status: error.status || 500 }
    );
  }
}

// PUT /api/inventory/stock-adjustments/[id]
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    logger.info(`[API] PUT /api/inventory/stock-adjustments/${id}`);
    
    // Forward request to Django backend
    const response = await fetchWithAuth(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/stock-adjustments/${id}/`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        cookies: request.cookies,
      }
    );

    const data = await response.json();
    logger.info(`[API] Stock adjustment updated:`, data.id);
    
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[API] Error updating stock adjustment:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to update stock adjustment' },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/inventory/stock-adjustments/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    logger.info(`[API] DELETE /api/inventory/stock-adjustments/${id}`);
    
    // Forward request to Django backend
    const response = await fetchWithAuth(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/stock-adjustments/${id}/`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        cookies: request.cookies,
      }
    );

    logger.info(`[API] Stock adjustment deleted:`, id);
    
    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error) {
    logger.error('[API] Error deleting stock adjustment:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to delete stock adjustment' },
      { status: error.status || 500 }
    );
  }
}