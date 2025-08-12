import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Django backend API URL
const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * Proxy route for Django estimates API
 * Following the industry standard pattern: Frontend → Local Proxy → Django Backend
 */

export async function GET(request) {
  try {
    // Get session cookie
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Forward request to Django backend
    const response = await fetch(`${DJANGO_API_URL}/api/sales/estimates/`, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Estimates Proxy] Backend error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to fetch estimates', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Estimates Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch estimates', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Get session cookie
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();

    // Get user's current currency preference for new estimates
    let userCurrency = 'USD'; // fallback
    try {
      console.log('[Estimates API] Fetching user currency preference...');
      const currencyResponse = await fetch(`${DJANGO_API_URL}/api/currency/preferences/`, {
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
          console.log('[Estimates API] Using user preferred currency:', userCurrency);
        } else {
          console.warn('[Estimates API] Currency preference response missing currency_code:', currencyData);
        }
      } else {
        console.warn('[Estimates API] Failed to fetch currency preference, using USD default');
      }
    } catch (currencyError) {
      console.error('[Estimates API] Error fetching currency preference:', currencyError);
    }
    
    // Add user's preferred currency to estimate data if not already specified
    const enhancedBody = {
      ...body,
      currency: body.currency || userCurrency
    };
    
    console.log('[Estimates API] Creating estimate with currency:', enhancedBody.currency);

    // Forward request to Django backend
    const response = await fetch(`${DJANGO_API_URL}/api/sales/estimates/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enhancedBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Estimates Proxy] Backend error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to create estimate', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Estimates Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create estimate', message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Get session cookie
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get estimate ID from URL
    const url = new URL(request.url);
    const estimateId = url.searchParams.get('id');
    
    if (!estimateId) {
      return NextResponse.json(
        { error: 'Estimate ID required' },
        { status: 400 }
      );
    }

    // Get request body
    const body = await request.json();

    // Forward request to Django backend
    const response = await fetch(`${DJANGO_API_URL}/api/sales/estimates/${estimateId}/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Estimates Proxy] Backend error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to update estimate', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Estimates Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update estimate', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    // Get session cookie
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get estimate ID from URL
    const url = new URL(request.url);
    const estimateId = url.searchParams.get('id');
    
    if (!estimateId) {
      return NextResponse.json(
        { error: 'Estimate ID required' },
        { status: 400 }
      );
    }

    // Forward request to Django backend
    const response = await fetch(`${DJANGO_API_URL}/api/sales/estimates/${estimateId}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Estimates Proxy] Backend error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to delete estimate', details: errorData },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Estimates Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete estimate', message: error.message },
      { status: 500 }
    );
  }
}