import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * GET /api/products
 * Fetches products from backend with authentication
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      console.error('[Products API] No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get search params from the request
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    console.log('[Products API] Fetching from backend with session:', sidCookie.value.substring(0, 8) + '...');
    
    // Call backend directly
    const response = await fetch(`${BACKEND_URL}/api/inventory/products/${queryString ? '?' + queryString : ''}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Products API] Backend error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform data to match POS expectations
    const products = data.results || data.products || data;
    const transformedProducts = Array.isArray(products) ? products.map(product => {
      // Debug logging to see what fields we're getting
      console.log('[Products API] Raw product fields:', Object.keys(product));
      console.log('[Products API] Product quantity field:', product.quantity);
      
      return {
        id: product.id,
        name: product.product_name || product.name,
        sku: product.product_code || product.sku || '',
        barcode: product.barcode || '',
        price: parseFloat(product.unit_price || product.price || 0),
        quantity_in_stock: parseInt(product.quantity || product.stock_quantity || product.quantity_in_stock || 0),
        description: product.description || ''
      };
    }) : [];

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
 * POST /api/products
 * Creates a new product
 */
export async function POST(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'Authentication required' },
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
      cache: 'no-store'
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