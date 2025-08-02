import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

/**
 * GET handler that fetches products from the backend
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    // Get search params from the request
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Call backend directly
    const response = await fetch(`${BACKEND_URL}/api/inventory/products/${queryString ? '?' + queryString : ''}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch products' },
        { status: response.status }
      );
    }

    // Transform data to match POS expectations
    const products = data.results || data.products || data;
    const transformedProducts = Array.isArray(products) ? products.map(product => ({
      id: product.id,
      name: product.product_name || product.name,
      sku: product.product_code || product.sku || '',
      barcode: product.barcode || '',
      price: parseFloat(product.unit_price || product.price || 0),
      quantity_in_stock: product.stock_quantity || product.quantity_in_stock || 0,
      description: product.description || ''
    })) : [];

    return NextResponse.json({
      success: true,
      products: transformedProducts
    });
  } catch (error) {
    console.error('[Products API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler that creates products in the backend
 */
export async function POST(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Call backend directly
    const response = await fetch(`${BACKEND_URL}/api/inventory/products/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to create product' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Products API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT handler that updates products in the backend
 */
export async function PUT(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const productId = body.id;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Call backend directly
    const response = await fetch(`${BACKEND_URL}/api/inventory/products/${productId}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to update product' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Products API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 