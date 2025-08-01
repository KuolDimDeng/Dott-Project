import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

// Helper function to get session cookie
async function getSessionCookie() {
  const cookieStore = cookies();
  const sidCookie = cookieStore.get('sid');
  return sidCookie;
}

// Backend is now fixed with proper ViewSets

export async function GET(request) {
  try {
    logger.info('[Orders API] GET request received');
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Orders API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Forward request to Django backend (Django requires trailing slash)
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/sales/orders/${queryString ? `?${queryString}` : ''}`;
    logger.info('[Orders API] Forwarding GET to:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[Orders API] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Transform backend response to match frontend expectations
    let transformedData = data;
    
    // Handle paginated response
    if (data.results && Array.isArray(data.results)) {
      transformedData = {
        ...data,
        results: data.results.map(order => ({
          ...order,
          customer_id: order.customer,
          order_date: order.date,
          order_number: order.order_number || order.id,
          total_amount: order.total_amount || order.totalAmount || order.total
        }))
      };
    } else if (Array.isArray(data)) {
      // Handle non-paginated array response
      transformedData = data.map(order => ({
        ...order,
        customer_id: order.customer,
        order_date: order.date,
        order_number: order.order_number || order.id,
        total_amount: order.total_amount || order.totalAmount || order.total
      }));
    }
    
    logger.info('[Orders API] Successfully fetched and transformed orders');
    return NextResponse.json(transformedData);
    
  } catch (error) {
    logger.error('[Orders API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    logger.info('[Orders API] POST request received');
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Orders API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    logger.info('[Orders API] Creating order with data:', body);
    
    // Get user's current currency preference for new orders
    let userCurrency = 'USD'; // fallback
    try {
      logger.info('[Orders API] Fetching user currency preference...');
      const currencyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/currency/preferences/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Session ${sidCookie.value}`,
        },
      });
      
      if (currencyResponse.ok) {
        const currencyData = await currencyResponse.json();
        if (currencyData.success && currencyData.preferences?.currency_code) {
          userCurrency = currencyData.preferences.currency_code;
          logger.info('[Orders API] Using user preferred currency:', userCurrency);
        } else {
          logger.warn('[Orders API] Currency preference response missing currency_code:', currencyData);
        }
      } else {
        logger.warn('[Orders API] Failed to fetch currency preference, using USD default');
      }
    } catch (currencyError) {
      logger.error('[Orders API] Error fetching currency preference:', currencyError);
    }
    
    // Transform frontend data to match backend expectations
    const backendData = {
      customer: body.customer_id,  // Backend expects 'customer' not 'customer_id'
      date: body.order_date,       // Backend expects 'date' not 'order_date'
      due_date: body.due_date,     // Backend migration 0004 adds this field
      status: body.status || 'pending',
      payment_terms: body.payment_terms,
      discount: body.discount_percentage || 0,
      discount_percentage: body.discount_percentage || 0,
      shipping_cost: body.shipping_cost || 0,
      tax_rate: body.tax_rate || 0,
      currency: body.currency || userCurrency, // Use user's preferred currency
      notes: body.notes || '',
      items: body.items?.map(item => ({
        item_type: item.type || 'product',
        product: item.type === 'product' ? item.item_id : null,
        service: item.type === 'service' ? item.item_id : null,
        description: item.description || item.name || 'Item',  // Ensure description is not blank
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0
      })) || []
    };
    
    logger.info('[Orders API] Transformed data for backend:', backendData);
    
    // Forward request to Django backend (Django requires trailing slash)
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/sales/orders/`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify(backendData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[Orders API] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to create order', details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Transform backend response to match frontend expectations
    const transformedData = {
      ...data,
      customer_id: data.customer,
      order_date: data.date,
      order_number: data.order_number || data.id,
      total_amount: data.total_amount || data.totalAmount || data.total
    };
    
    logger.info('[Orders API] Order created successfully:', transformedData);
    return NextResponse.json(transformedData, { status: 201 });
    
  } catch (error) {
    logger.error('[Orders API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}