import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

// Helper function to get session cookie
async function getSessionCookie() {
  const cookieStore = cookies();
  const sidCookie = cookieStore.get('sid');
  return sidCookie;
}

// Industry-standard API pattern: Frontend → Local Proxy → Django Backend → PostgreSQL with RLS

export async function GET(request) {
  try {
    logger.info('[Invoices API] GET request received');
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Invoices API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Forward request to Django backend (Django requires trailing slash)
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/sales/invoices/${queryString ? `?${queryString}` : ''}`;
    logger.info('[Invoices API] Forwarding GET to:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[Invoices API] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch invoices', details: errorText },
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
        results: data.results.map(invoice => ({
          ...invoice,
          customer_id: invoice.customer,
          issue_date: invoice.date,
          invoice_number: invoice.invoice_num || invoice.invoice_number || invoice.id,
          total_amount: invoice.total_amount || invoice.totalAmount || invoice.total
        }))
      };
    } else if (Array.isArray(data)) {
      // Handle non-paginated array response
      transformedData = data.map(invoice => ({
        ...invoice,
        customer_id: invoice.customer,
        issue_date: invoice.date,
        invoice_number: invoice.invoice_num || invoice.invoice_number || invoice.id,
        total_amount: invoice.total_amount || invoice.totalAmount || invoice.total
      }));
    }
    
    logger.info('[Invoices API] Successfully fetched and transformed invoices');
    return NextResponse.json(transformedData);
    
  } catch (error) {
    logger.error('[Invoices API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    logger.info('[Invoices API] POST request received');
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Invoices API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    logger.info('[Invoices API] Creating invoice with data:', body);
    
    // Validate that the invoice has items and a valid total
    if (!body.items || body.items.length === 0) {
      logger.error('[Invoices API] Cannot create invoice without items');
      return NextResponse.json({
        error: 'Cannot create invoice without items',
        message: 'Please add at least one item to the invoice'
      }, { status: 400 });
    }
    
    const totalAmount = parseFloat(body.total_amount || body.subtotal || 0);
    if (totalAmount < 0.01) {
      logger.error('[Invoices API] Invoice total must be at least $0.01');
      return NextResponse.json({
        error: 'Invalid invoice amount',
        message: 'Invoice total must be at least $0.01'
      }, { status: 400 });
    }
    
    // Get user's current currency preference for new invoices
    let userCurrency = 'USD'; // fallback
    try {
      logger.info('[Invoices API] Fetching user currency preference...');
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
          logger.info('[Invoices API] Using user preferred currency:', userCurrency);
        } else {
          logger.warn('[Invoices API] Currency preference response missing currency_code:', currencyData);
        }
      } else {
        logger.warn('[Invoices API] Failed to fetch currency preference, using USD default');
      }
    } catch (currencyError) {
      logger.error('[Invoices API] Error fetching currency preference:', currencyError);
    }
    
    // Transform frontend data to match backend expectations
    const backendData = {
      customer: body.customer_id,  // Backend expects 'customer' not 'customer_id'
      date: body.issue_date || body.invoice_date || new Date().toISOString().split('T')[0], // Ensure date format YYYY-MM-DD
      due_date: body.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 30 days from now
      status: body.status || 'draft',
      totalAmount: totalAmount.toFixed(2), // Django expects 2 decimal places
      discount: parseFloat(body.discount_amount || 0).toFixed(2),
      currency: body.currency || userCurrency, // Use user's preferred currency instead of USD
      notes: body.notes || '',
      terms: body.terms || '',
      items: body.items?.map(item => ({
        product: item.item_type === 'product' ? item.product : null,
        service: item.item_type === 'service' ? item.service : null,
        description: item.description || 'Item',
        quantity: parseFloat(item.quantity || 1).toFixed(2),
        unit_price: parseFloat(item.unit_price || 0).toFixed(2),
        tax_rate: parseFloat(item.tax_rate || 0).toFixed(2),
        tax_amount: parseFloat(item.tax_amount || 0).toFixed(2),
        total: parseFloat(item.total || (parseFloat(item.quantity || 1) * parseFloat(item.unit_price || 0))).toFixed(2)
      })) || []
    };
    
    // Add sales order reference if creating from order
    if (body.order_id) {
      backendData.sales_order = body.order_id;
    }
    
    logger.info('[Invoices API] Transformed data for backend:', backendData);
    
    // Forward request to Django backend (Django requires trailing slash)
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/sales/invoices/`;
    
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
      logger.error('[Invoices API] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to create invoice', details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Transform backend response to match frontend expectations
    const transformedData = {
      ...data,
      customer_id: data.customer,
      issue_date: data.date,
      invoice_number: data.invoice_num || data.invoice_number || data.id,
      total_amount: data.total_amount || data.totalAmount || data.total
    };
    
    logger.info('[Invoices API] Invoice created successfully:', transformedData);
    return NextResponse.json(transformedData, { status: 201 });
    
  } catch (error) {
    logger.error('[Invoices API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}