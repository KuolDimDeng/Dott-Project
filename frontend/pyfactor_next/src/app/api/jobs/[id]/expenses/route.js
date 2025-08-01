import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const backendUrl = `${BACKEND_URL}/api/jobs/${id}/expenses/`;
    logger.info('[Jobs Expenses API] Fetching expenses:', { jobId: id, backendUrl });

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const responseText = await response.text();
    logger.info('[Jobs Expenses API] Backend response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      bodyPreview: responseText.substring(0, 200)
    });

    if (!response.ok) {
      logger.error('[Jobs Expenses API] Backend error:', {
        status: response.status,
        body: responseText
      });
      return NextResponse.json(
        { error: responseText || 'Failed to fetch expenses' },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[Jobs Expenses API] JSON parse error:', parseError);
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Jobs Expenses API] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    
    // Get user's current currency preference for new job expenses
    let userCurrency = 'USD'; // fallback
    try {
      logger.info('[Jobs Expenses API] Fetching user currency preference...');
      const currencyResponse = await fetch(`${BACKEND_URL}/api/currency/preferences/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `sid=${sidCookie.value}`,
        },
      });
      
      if (currencyResponse.ok) {
        const currencyData = await currencyResponse.json();
        if (currencyData.success && currencyData.preferences?.currency_code) {
          userCurrency = currencyData.preferences.currency_code;
          logger.info('[Jobs Expenses API] Using user preferred currency:', userCurrency);
        } else {
          logger.warn('[Jobs Expenses API] Currency preference response missing currency_code:', currencyData);
        }
      } else {
        logger.warn('[Jobs Expenses API] Failed to fetch currency preference, using USD default');
      }
    } catch (currencyError) {
      logger.error('[Jobs Expenses API] Error fetching currency preference:', currencyError);
    }
    
    // Add user's preferred currency to expense data if not already specified
    const enhancedBody = {
      ...body,
      currency: body.currency || userCurrency
    };
    
    const backendUrl = `${BACKEND_URL}/api/jobs/${id}/expenses/`;
    logger.info('[Jobs Expenses API] Creating expense:', { jobId: id, body: enhancedBody });

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(enhancedBody)
    });

    const responseText = await response.text();
    logger.info('[Jobs Expenses API] Backend response:', {
      status: response.status,
      bodyPreview: responseText.substring(0, 200)
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: responseText || 'Failed to create expense' },
        { status: response.status }
      );
    }

    const data = JSON.parse(responseText);
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Jobs Expenses API] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}