import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrencyInfo } from '@/utils/currencyFormatter';

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
    // IMPORTANT: Always use api.dottapps.com for production
    const backendUrl = 'https://api.dottapps.com';
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
      console.error('[Currency Optimized] Backend error details:', {
        message: backendError.message,
        stack: backendError.stack,
        name: backendError.name
      });
      
      // Return error instead of defaults to help debug the issue
      return NextResponse.json({
        success: false,
        error: `Backend error: ${backendError.message}`,
        fallback: false,
        debug: {
          backendUrl: fullUrl,
          hasSession: !!sessionId,
          errorType: backendError.name
        }
      }, { status: 503 });
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
  const requestStart = Date.now();
  try {
    const body = await request.json();
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid')?.value || cookieStore.get('session_token')?.value;
    
    console.log('🔄 [Currency API] === PUT REQUEST START ===');
    console.log('🔄 [Currency API] Timestamp:', new Date().toISOString());
    console.log('🔄 [Currency API] Request body:', body);
    console.log('🔄 [Currency API] Session ID present:', !!sessionId);
    
    if (!sessionId) {
      console.log('🔄 [Currency API] No session found, returning 401');
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Build backend URL with guaranteed trailing slash
    // IMPORTANT: Always use api.dottapps.com for production
    const backendUrl = 'https://api.dottapps.com';
    const endpoint = ensureTrailingSlash('/api/currency/preferences');
    const fullUrl = ensureTrailingSlash(`${backendUrl}${endpoint}`);
    
    console.log('🔄 [Currency API] Backend URL:', fullUrl);
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Dott-Frontend-Optimized/1.0',
      'Authorization': `Session ${sessionId}`,
      'Cookie': `sid=${sessionId}; session_token=${sessionId}`,
    };
    
    try {
      console.log('🔄 [Currency API] Making backend request...');
      const backendStart = Date.now();
      
      const backendResponse = await directBackendCall(fullUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
      
      const backendDuration = Date.now() - backendStart;
      console.log('🔄 [Currency API] Backend response received in:', backendDuration, 'ms');
      console.log('🔄 [Currency API] Backend response status:', backendResponse.status);
      
      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        console.error('🔄 [Currency API] Backend error response:', errorText.substring(0, 500));
        
        // Parse error details if possible
        let errorMessage = `Backend error: ${backendResponse.status}`;
        let errorDetails = null;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
          errorDetails = errorData;
        } catch (e) {
          // If not JSON, use the text
          errorMessage = errorText.substring(0, 200) || errorMessage;
        }
        
        console.error('🔄 [Currency API] Returning error response - NOT masking with success');
        console.log('🔄 [Currency API] Total time:', Date.now() - requestStart, 'ms');
        
        return NextResponse.json({
          success: false,
          error: errorMessage,
          status_code: backendResponse.status,
          details: errorDetails,
          backend_url: fullUrl
        }, { status: backendResponse.status });
      }
      
      const data = await backendResponse.json();
      console.log('🔄 [Currency API] Backend success response:', data);
      
      const response = {
        success: true,
        ...data
      };
      
      console.log('🔄 [Currency API] Returning success response:', response);
      console.log('🔄 [Currency API] Total time:', Date.now() - requestStart, 'ms');
      
      return NextResponse.json(response);
      
    } catch (backendError) {
      console.error('🔄 [Currency API] Backend error:', backendError);
      console.error('🔄 [Currency API] Error stack:', backendError.stack);
      
      const errorMessage = backendError.message || 'Backend request failed';
      
      console.error('🔄 [Currency API] Returning error response - NOT masking with success');
      console.log('🔄 [Currency API] Total time:', Date.now() - requestStart, 'ms');
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        error_type: 'network_error',
        backend_url: fullUrl
      }, { status: 503 });
    }
    
  } catch (error) {
    console.error('🔄 [Currency API] Request error:', error);
    console.log('🔄 [Currency API] Total time:', Date.now() - requestStart, 'ms');
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}