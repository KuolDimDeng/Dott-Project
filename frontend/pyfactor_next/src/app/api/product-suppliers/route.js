import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

/**
 * Product Suppliers API - for businesses that supply products to you for resale
 * These are the suppliers whose products you buy and then sell for profit
 * Different from:
 * - Vendors (utility service providers like electricity, water)
 * - Supplies (repair materials and parts used in service jobs)
 * 
 * Note: Currently maps to Django products endpoint but should eventually
 * map to a dedicated suppliers endpoint on the backend
 */

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Forward to Django backend - using suppliers endpoint for businesses that supply products
    const backendUrl = `${BACKEND_URL}/api/inventory/suppliers/${queryString ? `?${queryString}` : ''}`;
    
    console.log('[Product Suppliers API] Fetching from:', backendUrl);
    
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
    
    // Transform the response to match what the frontend expects
    // These are supplier businesses, not products
    let suppliers = [];
    if (Array.isArray(data)) {
      suppliers = data;
    } else if (data?.results) {
      suppliers = data.results;
    }
    
    // Return in the expected format
    const responseData = {
      results: suppliers,
      count: data?.count || suppliers.length,
      next: data?.next || null,
      previous: data?.previous || null
    };
    
    console.log('[Product Suppliers API] Returning', responseData.results.length, 'product suppliers');
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[Product Suppliers API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Transform the data if needed for supplier creation
    const supplierData = {
      ...body,
      is_active: true,
    };
    
    console.log('[Product Suppliers API] Creating product supplier:', supplierData);
    
    // Forward to Django backend suppliers endpoint
    const backendUrl = `${BACKEND_URL}/api/inventory/suppliers/`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify(supplierData),
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
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[Product Suppliers API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

// Add support for individual product operations
export async function PUT(request) {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }
    
    // Extract product ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const productId = pathParts[pathParts.length - 1];
    
    if (!productId || productId === 'product-suppliers') {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Transform the data if needed
    const productData = {
      ...body,
      quantity: body.quantity || body.stock_quantity || body.quantity_in_stock || 0,
    };
    
    // Forward to Django backend
    const backendUrl = `${BACKEND_URL}/api/inventory/products/${productId}/`;
    
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
    
    // Add quantity_in_stock for frontend compatibility
    if (data) {
      data.quantity_in_stock = data.quantity || data.stock_quantity || 0;
      data.stock_quantity = data.quantity || data.stock_quantity || 0;
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Product Suppliers API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }
    
    // Extract product ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const productId = pathParts[pathParts.length - 1];
    
    if (!productId || productId === 'product-suppliers') {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    
    // Forward to Django backend
    const backendUrl = `${BACKEND_URL}/api/inventory/products/${productId}/`;
    
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