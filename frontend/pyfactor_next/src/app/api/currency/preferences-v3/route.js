import { NextResponse } from 'next/server';

async function callBackendAPI(url, options = {}) {
  console.log(`[Currency V3] Calling backend: ${url}`);
  
  // First attempt
  let response = await fetch(url, {
    ...options,
    redirect: 'manual' // Don't follow redirects automatically
  });
  
  // If we get a redirect, follow it
  if ([301, 302, 307, 308].includes(response.status)) {
    const redirectUrl = response.headers.get('location');
    console.log(`[Currency V3] Following redirect to: ${redirectUrl}`);
    
    // Make absolute URL if relative
    const finalUrl = redirectUrl.startsWith('http') 
      ? redirectUrl 
      : new URL(redirectUrl, url).toString();
    
    response = await fetch(finalUrl, options);
  }
  
  return response;
}

export async function GET(request) {
  try {
    console.log('[Currency V3] GET request started');
    
    // Get the cookie from the request
    const cookie = request.headers.get('cookie');
    
    // Build the backend URL with trailing slash
    const backendUrl = process.env.BACKEND_URL || 'https://api.dottapps.com';
    const endpoint = '/api/currency/preferences/'; // Ensure trailing slash
    const fullUrl = `${backendUrl}${endpoint}`;
    
    console.log('[Currency V3] Backend URL:', fullUrl);
    console.log('[Currency V3] Has cookie:', !!cookie);
    
    const backendResponse = await callBackendAPI(fullUrl, {
      method: 'GET',
      headers: {
        'Cookie': cookie || '',
        'Accept': 'application/json',
        'User-Agent': 'Dott-Frontend/1.0'
      },
    });

    console.log('[Currency V3] Response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Currency V3] Backend error:', errorText.substring(0, 500));
      
      // Return default preferences on error
      return NextResponse.json({
        success: true,
        preferences: {
          currency_code: 'USD',
          currency_name: 'US Dollar',
          currency_symbol: '$',
          show_usd_on_invoices: true,
          show_usd_on_quotes: true,
          show_usd_on_reports: false,
        }
      });
    }

    const data = await backendResponse.json();
    console.log('[Currency V3] Backend data:', data);
    
    // Handle different response formats
    if (data.preferences) {
      return NextResponse.json(data);
    } else if (data.currency_code) {
      // Backend might return data directly
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
    } else {
      // If format is unexpected, return defaults
      console.warn('[Currency V3] Unexpected data format:', data);
      return NextResponse.json({
        success: true,
        preferences: {
          currency_code: 'USD',
          currency_name: 'US Dollar', 
          currency_symbol: '$',
          show_usd_on_invoices: true,
          show_usd_on_quotes: true,
          show_usd_on_reports: false,
        }
      });
    }
  } catch (error) {
    console.error('[Currency V3] Error:', error);
    
    // Return default preferences on error
    return NextResponse.json({
      success: true,
      preferences: {
        currency_code: 'USD',
        currency_name: 'US Dollar',
        currency_symbol: '$',
        show_usd_on_invoices: true,
        show_usd_on_quotes: true,
        show_usd_on_reports: false,
      }
    });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const cookie = request.headers.get('cookie');
    
    console.log('[Currency V3] PUT request started');
    console.log('[Currency V3] PUT body:', body);
    
    // Build the backend URL with trailing slash
    const backendUrl = process.env.BACKEND_URL || 'https://api.dottapps.com';
    const endpoint = '/api/currency/preferences/'; // Ensure trailing slash
    const fullUrl = `${backendUrl}${endpoint}`;
    
    const backendResponse = await callBackendAPI(fullUrl, {
      method: 'PUT',
      headers: {
        'Cookie': cookie || '',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Dott-Frontend/1.0'
      },
      body: JSON.stringify(body),
    });

    console.log('[Currency V3] PUT response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Currency V3] Backend error:', errorText.substring(0, 500));
      return NextResponse.json(
        { success: false, error: 'Failed to update currency preferences' },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    console.log('[Currency V3] PUT response data:', data);
    
    return NextResponse.json({
      success: true,
      ...data
    });
  } catch (error) {
    console.error('[Currency V3] PUT error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}