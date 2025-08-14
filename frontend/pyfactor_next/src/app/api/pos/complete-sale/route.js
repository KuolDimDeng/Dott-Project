import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

export async function POST(request) {
  logger.info('[POSProxy] Incoming POST request to complete sale');
  
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      logger.warn('[POSProxy] No session cookie found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const saleData = await request.json();
    logger.info('[POSProxy] Sale data received:', JSON.stringify(saleData, null, 2));

    // Validate required fields
    if (!saleData.items || !Array.isArray(saleData.items) || saleData.items.length === 0) {
      return NextResponse.json({ error: 'Sale must contain at least one item' }, { status: 400 });
    }

    // Get user's current currency preference for POS sales
    let userCurrency = 'USD'; // fallback
    try {
      logger.info('[POSProxy] Fetching user currency preference...');
      const currencyResponse = await fetch(`${BACKEND_URL}/api/currency/preferences`, {
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
          logger.info('[POSProxy] Using user preferred currency:', userCurrency);
        } else {
          logger.warn('[POSProxy] Currency preference response missing currency_code:', currencyData);
        }
      } else {
        logger.warn('[POSProxy] Failed to fetch currency preference, using USD default');
      }
    } catch (currencyError) {
      logger.error('[POSProxy] Error fetching currency preference:', currencyError);
    }

    // Prepare the sale data for backend - matching the expected format
    const backendSaleData = {
      items: saleData.items.map(item => ({
        id: item.product_id || item.id,
        type: item.type || 'product', // Default to product if not specified
        quantity: parseFloat(item.quantity || 1),
        unit_price: parseFloat(item.unit_price || item.price || 0)
      })),
      customer_id: saleData.customer_id || null,
      payment_method: saleData.payment_method,
      amount_tendered: parseFloat(saleData.amount_tendered || saleData.total_amount || 0),
      discount_percentage: parseFloat(saleData.discount_percentage || 0),
      tax_rate: parseFloat(saleData.tax_rate || 0),
      notes: saleData.notes || '',
      // Include currency information from frontend
      currency_code: saleData.currency || userCurrency || 'USD',
      currency_symbol: saleData.currencySymbol || '$'
    };

    // Use the POS complete-sale endpoint
    const url = `${BACKEND_URL}/api/sales/pos/transactions/complete-sale/`;
    logger.info('[POSProxy] Forwarding POST request to:', url);
    logger.info('[POSProxy] Backend sale data:', JSON.stringify(backendSaleData, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendSaleData),
    });

    const responseText = await response.text();
    logger.info('[POSProxy] Backend response status:', response.status);

    if (!response.ok) {
      logger.error('[POSProxy] Backend error:', responseText);
      return NextResponse.json(
        { error: responseText || `Backend returned ${response.status}` },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[POSProxy] Failed to parse response:', parseError);
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    logger.info('[POSProxy] Sale completed successfully:', {
      sale_id: data.id,
      total_amount: data.total_amount,
      items_count: data.items?.length || 0
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error('[POSProxy] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}