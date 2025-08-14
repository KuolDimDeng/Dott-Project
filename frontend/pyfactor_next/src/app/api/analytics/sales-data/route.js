import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    console.log('[Sales-Data Route] ========== REQUEST START ==========');
    console.log('[Sales-Data Route] Request URL:', request.url);
    console.log('[Sales-Data Route] Request method:', request.method);
    
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('[Sales-Data Route] All cookies available:', allCookies.map(c => c.name).join(', '));
    
    const sessionId = cookieStore.get('sid')?.value || cookieStore.get('session_token')?.value;
    console.log('[Sales-Data Route] Session ID found:', !!sessionId);
    console.log('[Sales-Data Route] Session ID (first 10 chars):', sessionId ? sessionId.substring(0, 10) + '...' : 'none');
    
    if (!sessionId) {
      console.error('[Sales-Data Route] No session found in cookies');
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('time_range') || '1';
    
    console.log('[Sales-Data Route] Time range requested:', timeRange);
    
    // Use environment variable or fallback to production API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const backendUrl = `${apiUrl}/api/analytics/sales-data?time_range=${timeRange}`;
    
    console.log('[Sales-Data Route] Fetching from backend:', backendUrl);
    
    const response = await fetch(backendUrl, {
      headers: {
        'Cookie': `sid=${sessionId}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    console.log('[Sales-Data Route] Backend response status:', response.status);
    console.log('[Sales-Data Route] Backend response headers:', {
      'content-type': response.headers.get('content-type'),
      'content-length': response.headers.get('content-length'),
      'server': response.headers.get('server')
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Try to read the response text for debugging
      const text = await response.text();
      console.error('[Sales-Data Route] ERROR: Non-JSON response from backend');
      console.error('[Sales-Data Route] Response text (first 1000 chars):', text.substring(0, 1000));
      
      // Check if it's an HTML error page
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        console.error('[Sales-Data Route] Backend returned HTML error page - likely a middleware or auth issue');
      }
      
      // Return empty data to prevent frontend crash
      return NextResponse.json({
        total_sales: 0,
        total_transactions: 0,
        average_order_value: 0,
        top_products: [],
        recent_sales: [],
        sales_over_time: [],
        error: 'Backend returned non-JSON response (likely auth or middleware issue)'
      });
    }

    if (!response.ok) {
      console.error('[Sales-Data Route] Backend returned error status:', response.status);
      
      let errorData;
      try {
        errorData = await response.json();
        console.error('[Sales-Data Route] Backend error data:', errorData);
      } catch (e) {
        console.error('[Sales-Data Route] Could not parse error response as JSON');
        errorData = { error: `HTTP ${response.status} error` };
      }
      
      // Return empty data with error message
      return NextResponse.json({
        total_sales: 0,
        total_transactions: 0,
        average_order_value: 0,
        top_products: [],
        recent_sales: [],
        sales_over_time: [],
        error: errorData.error || `Backend error: ${response.status}`
      });
    }

    const data = await response.json();
    console.log('[Sales-Data Route] Successfully fetched data');
    console.log('[Sales-Data Route] Data summary:', {
      total_sales: data.total_sales || data.totalSales || 0,
      total_transactions: data.total_transactions || data.numberOfOrders || 0,
      top_products_count: Array.isArray(data.top_products) ? data.top_products.length : 0,
      sales_over_time_count: Array.isArray(data.sales_over_time) ? data.sales_over_time.length : 0
    });
    console.log('[Sales-Data Route] ========== REQUEST END ==========');
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Sales-Data Route] ========== ERROR ==========');
    console.error('[Sales-Data Route] Error processing request:', error.message);
    console.error('[Sales-Data Route] Error stack:', error.stack);
    console.error('[Sales-Data Route] Error type:', error.constructor.name);
    
    // Return empty data structure to prevent frontend crash
    return NextResponse.json({
      total_sales: 0,
      total_transactions: 0,
      average_order_value: 0,
      top_products: [],
      recent_sales: [],
      sales_over_time: [],
      error: `Internal server error: ${error.message}`
    });
  }
}