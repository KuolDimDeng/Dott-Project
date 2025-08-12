import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

/**
 * Individual Product Supplier operations
 * Maps to Django products endpoint for specific product operations
 */

export async function GET(request, { params }) {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    // Forward to Django backend suppliers endpoint
    const backendUrl = `${BACKEND_URL}/api/inventory/suppliers/${id}/`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[Product Suppliers API] Backend error:', error);
      return NextResponse.json(
        { error: error || `HTTP ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Product Suppliers API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    const body = await request.json();
    
    // Transform the data if needed
    const productData = {
      ...body,
      quantity: body.quantity || body.stock_quantity || body.quantity_in_stock || 0,
    };
    
    // Forward to Django backend suppliers endpoint
    const backendUrl = `${BACKEND_URL}/api/inventory/suppliers/${id}/`;
    
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify(productData),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[Product Suppliers API] Backend error:', error);
      return NextResponse.json(
        { error: error || `HTTP ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Product Suppliers API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    // Forward to Django backend suppliers endpoint
    const backendUrl = `${BACKEND_URL}/api/inventory/suppliers/${id}/`;
    
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[Product Suppliers API] Backend error:', error);
      return NextResponse.json(
        { error: error || `HTTP ${response.status}` },
        { status: response.status }
      );
    }
    
    // DELETE might return 204 No Content
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Product Suppliers API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}