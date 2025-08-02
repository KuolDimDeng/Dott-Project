import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

/**
 * GET handler that fetches a single product by ID from the backend
 */
export async function GET(request, { params }) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const productId = params.id;
    
    // Call backend directly
    const response = await fetch(`${BACKEND_URL}/api/inventory/products/${productId}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { error: 'Product not found' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform data to match POS expectations
    const transformedProduct = {
      id: data.id,
      name: data.product_name || data.name,
      sku: data.product_code || data.sku || '',
      barcode: data.barcode || '',
      price: parseFloat(data.unit_price || data.price || 0),
      quantity_in_stock: data.stock_quantity || data.quantity_in_stock || 0,
      description: data.description || ''
    };

    return NextResponse.json(transformedProduct);
  } catch (error) {
    console.error('[Product API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}