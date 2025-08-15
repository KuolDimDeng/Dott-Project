import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
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
    
    // Forward the request to Django backend - using the correct endpoint
    const response = await fetch(`${BACKEND_URL}/api/sales/pos/transactions/${queryString ? '?' + queryString : ''}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sidCookie.value}`,
      },
    });

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If not JSON, it's likely an HTML error page
      const text = await response.text();
      console.error('[POS Transactions API] Non-JSON response:', text.substring(0, 500));
      return NextResponse.json(
        { error: 'Backend returned non-JSON response', results: [], count: 0 },
        { status: response.status || 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch POS transactions' },
        { status: response.status }
      );
    }

    // Debug logging for currency
    console.log('[POS API] 💰 Currency Debug - Backend response:', {
      totalCount: data.count,
      firstTransaction: data.results?.[0] ? {
        id: data.results[0].id,
        transaction_number: data.results[0].transaction_number,
        currency_code: data.results[0].currency_code,
        currency_symbol: data.results[0].currency_symbol,
        total_amount: data.results[0].total_amount
      } : null
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('[POS Transactions API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Forward the request to Django backend
    const response = await fetch(`${BACKEND_URL}/api/sales/pos/transactions/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sidCookie.value}`,
      },
      body: JSON.stringify(body),
    });

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If not JSON, it's likely an HTML error page
      const text = await response.text();
      console.error('[POS Transactions API] Non-JSON response:', text.substring(0, 500));
      return NextResponse.json(
        { error: 'Backend returned non-JSON response' },
        { status: response.status || 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to create POS transaction' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[POS Transactions API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}