import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request, { params }) {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const { id } = params;
    
    // Forward the request to Django backend
    const response = await fetch(`${BACKEND_URL}/api/sales/pos/transactions/${id}/`, {
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
      console.error('[POS Transaction Detail API] Non-JSON response:', text.substring(0, 500));
      return NextResponse.json(
        { error: 'Backend returned non-JSON response' },
        { status: response.status || 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch POS transaction' },
        { status: response.status }
      );
    }

    // Debug logging for currency
    console.log('[POS Detail API] 💰 Currency Debug - Backend response:', {
      id: data.id,
      transaction_number: data.transaction_number,
      currency_code: data.currency_code,
      currency_symbol: data.currency_symbol,
      total_amount: data.total_amount
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('[POS Transaction Detail API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}