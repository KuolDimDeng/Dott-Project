import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

/**
 * GET /api/products
 * Fetches products from backend with authentication
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
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
    
    console.log('[Products API] ========== DEBUG START ==========');
    console.log('[Products API] Session:', sidCookie.value.substring(0, 8) + '...');
    console.log('[Products API] BACKEND_URL env var:', BACKEND_URL);
    
    // Call backend directly - ensure proper URL format with trailing slash
    const backendUrl = queryString 
      ? `${BACKEND_URL}/api/inventory/products/?${queryString}`
      : `${BACKEND_URL}/api/inventory/products/`;
    
    console.log('[Products API] Fetching from:', backendUrl);
    console.log('[Products API] Query string:', queryString || 'none');
    
    const response = await fetch(backendUrl, {
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
    
    console.log('[Products API] Raw backend response:', {
      hasData: !!data,
      dataType: typeof data,
      isArray: Array.isArray(data),
      hasResults: !!data.results,
      resultsIsArray: Array.isArray(data.results),
      resultsLength: data.results ? data.results.length : 0,
      keys: Object.keys(data)
    });

    // Transform data to match POS expectations
    const products = data.results || data.products || data;
    
    console.log('[Products API] Products array info:', {
      isArray: Array.isArray(products),
      length: Array.isArray(products) ? products.length : 0,
      firstProductKeys: Array.isArray(products) && products.length > 0 ? Object.keys(products[0]) : []
    });
    
    const transformedProducts = Array.isArray(products) ? products.map((product, index) => {
      // Debug logging for EVERY product
      console.log(`[Products API] Product ${index + 1}:`, {
        id: product.id,
        name: product.name || product.product_name,
        hasQuantity: 'quantity' in product,
        quantity: product.quantity,
        hasStockQuantity: 'stock_quantity' in product,
        stock_quantity: product.stock_quantity,
        hasQuantityInStock: 'quantity_in_stock' in product,
        quantity_in_stock: product.quantity_in_stock,
        allKeys: Object.keys(product)
      });
      
      // The backend Product model uses 'quantity' field
      // But frontend often expects 'stock_quantity'
      const stockQty = product.quantity !== undefined ? product.quantity : 
                       product.stock_quantity !== undefined ? product.stock_quantity :
                       product.quantity_in_stock !== undefined ? product.quantity_in_stock :
                       0;
      
      const transformed = {
        id: product.id,
        name: product.product_name || product.name || 'Unnamed Product',
        sku: product.product_code || product.sku || product.code || '',
        barcode: product.barcode || '',
        price: parseFloat(product.unit_price || product.price || product.selling_price || 0),
        quantity: parseInt(stockQty),  // Use 'quantity' to match backend field name
        quantity_in_stock: parseInt(stockQty),  // Also provide quantity_in_stock for compatibility
        stock_quantity: parseInt(stockQty),  // Also provide stock_quantity for compatibility
        description: product.description || ''
      };
      
      console.log(`[Products API] Transformed product ${index + 1}:`, {
        name: transformed.name,
        originalQuantity: product.quantity,
        stockQty: stockQty,
        transformedQuantity: transformed.quantity_in_stock
      });
      
      return transformed;
    }) : [];
    
    console.log('[Products API] ========== FINAL RESULT ==========');
    console.log(`[Products API] Total products transformed: ${transformedProducts.length}`);
    console.log('[Products API] All quantities:', transformedProducts.map(p => ({
      name: p.name,
      quantity_in_stock: p.quantity_in_stock
    })));

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