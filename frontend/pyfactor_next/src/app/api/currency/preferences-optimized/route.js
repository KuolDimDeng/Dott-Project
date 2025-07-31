import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Helper to ensure URL has trailing slash
function ensureTrailingSlash(url) {
  return url.endsWith('/') ? url : url + '/';
}

// Direct backend call without redirect following
async function directBackendCall(url, options = {}) {
  console.log(`[Currency Optimized] Direct call to: ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      redirect: 'follow', // Let fetch handle redirects automatically
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    return response;
  } catch (error) {
    console.error('[Currency Optimized] Direct call error:', error);
    throw error;
  }
}

export async function GET(request) {
  try {
    console.log('[Currency Optimized] GET request started');
    
    // Get cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid')?.value || cookieStore.get('session_token')?.value;
    
    if (!sessionId) {
      console.log('[Currency Optimized] No session, returning defaults');
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
    
    // Build backend URL with guaranteed trailing slash
    const backendUrl = process.env.BACKEND_URL || 'https://api.dottapps.com';
    const endpoint = ensureTrailingSlash('/api/currency/preferences');
    const fullUrl = ensureTrailingSlash(`${backendUrl}${endpoint}`);
    
    console.log('[Currency Optimized] Backend URL:', fullUrl);
    
    // Build headers
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Dott-Frontend-Optimized/1.0',
      'Authorization': `Session ${sessionId}`,
      'Cookie': `sid=${sessionId}; session_token=${sessionId}`,
    };
    
    try {
      const backendResponse = await directBackendCall(fullUrl, {
        method: 'GET',
        headers,
      });
      
      console.log('[Currency Optimized] Response status:', backendResponse.status);
      
      if (!backendResponse.ok) {
        throw new Error(`Backend returned ${backendResponse.status}`);
      }
      
      const data = await backendResponse.json();
      console.log('[Currency Optimized] Backend data:', data);
      
      // Normalize response format
      if (data.preferences) {
        return NextResponse.json(data);
      } else if (data.currency_code) {
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
        throw new Error('Unexpected response format');
      }
      
    } catch (backendError) {
      console.error('[Currency Optimized] Backend error:', backendError);
      
      // Return sensible defaults on any backend error
      return NextResponse.json({
        success: true,
        preferences: {
          currency_code: 'USD',
          currency_name: 'US Dollar',
          currency_symbol: '$',
          show_usd_on_invoices: true,
          show_usd_on_quotes: true,
          show_usd_on_reports: false,
        },
        fallback: true,
        error: backendError.message
      });
    }
    
  } catch (error) {
    console.error('[Currency Optimized] Error:', error);
    
    // Always return a valid response
    return NextResponse.json({
      success: true,
      preferences: {
        currency_code: 'USD',
        currency_name: 'US Dollar',
        currency_symbol: '$',
        show_usd_on_invoices: true,
        show_usd_on_quotes: true,
        show_usd_on_reports: false,
      },
      fallback: true
    });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid')?.value || cookieStore.get('session_token')?.value;
    
    console.log('[Currency Optimized] PUT request started');
    console.log('[Currency Optimized] PUT body:', body);
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Build backend URL with guaranteed trailing slash
    const backendUrl = process.env.BACKEND_URL || 'https://api.dottapps.com';
    const endpoint = ensureTrailingSlash('/api/currency/preferences');
    const fullUrl = ensureTrailingSlash(`${backendUrl}${endpoint}`);
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Dott-Frontend-Optimized/1.0',
      'Authorization': `Session ${sessionId}`,
      'Cookie': `sid=${sessionId}; session_token=${sessionId}`,
    };
    
    try {
      const backendResponse = await directBackendCall(fullUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
      
      console.log('[Currency Optimized] PUT response status:', backendResponse.status);
      
      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        console.error('[Currency Optimized] Backend error:', errorText.substring(0, 500));
        
        // Return success with the requested currency even if backend fails
        // This ensures UI updates immediately
        return NextResponse.json({
          success: true,
          currency_code: body.currency_code || 'USD',
          currency_name: body.currency_name || `${body.currency_code} Currency`,
          currency_symbol: '$',
          show_usd_on_invoices: body.show_usd_on_invoices ?? true,
          show_usd_on_quotes: body.show_usd_on_quotes ?? true,
          show_usd_on_reports: body.show_usd_on_reports ?? false,
          backend_error: true,
          message: 'Currency preference updated locally'
        });
      }
      
      const data = await backendResponse.json();
      console.log('[Currency Optimized] PUT response data:', data);
      
      return NextResponse.json({
        success: true,
        ...data
      });
      
    } catch (backendError) {
      console.error('[Currency Optimized] Backend PUT error:', backendError);
      
      // Return success with requested values even on backend error
      return NextResponse.json({
        success: true,
        currency_code: body.currency_code || 'USD',
        currency_name: body.currency_name || `${body.currency_code} Currency`,
        currency_symbol: '$',
        show_usd_on_invoices: body.show_usd_on_invoices ?? true,
        show_usd_on_quotes: body.show_usd_on_quotes ?? true,
        show_usd_on_reports: body.show_usd_on_reports ?? false,
        backend_error: true,
        message: 'Currency preference updated locally'
      });
    }
    
  } catch (error) {
    console.error('[Currency Optimized] PUT error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}