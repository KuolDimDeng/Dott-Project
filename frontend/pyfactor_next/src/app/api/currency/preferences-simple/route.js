import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Get the cookie from the request
    const cookie = request.headers.get('cookie');
    
    // Call the backend API directly
    const backendResponse = await fetch(`${process.env.BACKEND_URL || 'https://api.dottapps.com'}/api/currency/preferences/`, {
      headers: {
        'Cookie': cookie || '',
        'Accept': 'application/json',
      },
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend error:', errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch currency preferences' },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    
    // Ensure we return the expected format
    if (data.currency_code) {
      return NextResponse.json({
        success: true,
        preferences: {
          currency_code: data.currency_code || 'USD',
          currency_name: data.currency_name || 'US Dollar',
          currency_symbol: data.currency_symbol || '$',
          show_usd_on_invoices: data.show_usd_on_invoices ?? true,
          show_usd_on_quotes: data.show_usd_on_quotes ?? true,
          show_usd_on_reports: data.show_usd_on_reports ?? false,
        }
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Currency preferences error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const cookie = request.headers.get('cookie');
    
    const backendResponse = await fetch(`${process.env.BACKEND_URL || 'https://api.dottapps.com'}/api/currency/preferences/`, {
      method: 'PUT',
      headers: {
        'Cookie': cookie || '',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend error:', errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to update currency preferences' },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Currency preferences update error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}