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
    
    console.log('[Products API] Full backend response structure:', JSON.stringify(data).substring(0, 500));

    // Transform data to match POS expectations
    const products = data.results || data.products || data;
    const transformedProducts = Array.isArray(products) ? products.map((product, index) => {
      // Debug logging to see what fields we're getting
      if (index === 0) {
        console.log('[Products API] First product full data:', JSON.stringify(product));
        console.log('[Products API] Product fields available:', Object.keys(product));
        console.log('[Products API] Looking for quantity fields:');
        console.log('  - product.quantity:', product.quantity);
        console.log('  - product.stock_quantity:', product.stock_quantity);
        console.log('  - product.quantity_in_stock:', product.quantity_in_stock);
      }
      
      // Try all possible field names
      const stockQty = product.quantity || 
                       product.stock_quantity || 
                       product.quantity_in_stock || 
                       product.qty ||
                       product.stock ||
                       0;
      
      const transformed = {
        id: product.id,
        name: product.product_name || product.name || 'Unnamed Product',
        sku: product.product_code || product.sku || product.code || '',
        barcode: product.barcode || '',
        price: parseFloat(product.unit_price || product.price || product.selling_price || 0),
        quantity_in_stock: parseInt(stockQty),
        description: product.description || ''
      };
      
      if (index === 0) {
        console.log('[Products API] Transformed product:', transformed);
      }
      
      return transformed;
    }) : [];
    
    console.log(`[Products API] Transformed ${transformedProducts.length} products`);

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