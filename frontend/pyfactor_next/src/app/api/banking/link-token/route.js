import { cookies } from 'next/headers';

/**
 * Banking API Proxy - Link Token Creation
 * Proxies requests to Django backend to avoid CORS issues
 * Uses session-based authentication
 */
export async function POST(request) {
  try {
    console.log('🏦 [LinkTokenProxy] === REQUEST START ===');
    
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    console.log('🏦 [LinkTokenProxy] Session cookie found:', !!sidCookie);
    
    if (!sidCookie) {
      console.error('🏦 [LinkTokenProxy] No session cookie found');
      return Response.json({ error: 'No session found' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    console.log('🏦 [LinkTokenProxy] Request body:', body);
    
    // Forward request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    console.log('🏦 [LinkTokenProxy] Backend URL:', backendUrl);
    
    // Try to get tenant ID for the request
    let tenantId = null;
    try {
      // Get tenant ID from session
      const sessionResponse = await fetch(`${backendUrl}/api/auth/session-v2`, {
        method: 'GET',
        headers: {
          'Authorization': `Session ${sidCookie.value}`,
        },
      });
      
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        tenantId = sessionData.user?.tenant_id || sessionData.user?.business_id;
        console.log('🏦 [LinkTokenProxy] Got tenant ID from session:', tenantId);
      }
    } catch (error) {
      console.error('🏦 [LinkTokenProxy] Error getting tenant ID:', error);
    }

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Session ${sidCookie.value}`,
    };
    
    // Add tenant ID if available
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }

    const backendResponse = await fetch(`${backendUrl}/api/banking/link_token/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log('🏦 [LinkTokenProxy] Backend response status:', backendResponse.status);
    console.log('🏦 [LinkTokenProxy] Backend response headers:', Object.fromEntries(backendResponse.headers.entries()));

    if (!backendResponse.ok) {
      const errorData = await backendResponse.text();
      console.error('🏦 [LinkTokenProxy] Backend error:', backendResponse.status, errorData);
      
      // Try to parse error data as JSON for better error message
      let errorMessage = `Backend error: ${backendResponse.status}`;
      try {
        const errorJson = JSON.parse(errorData);
        errorMessage = errorJson.error || errorJson.detail || errorJson.message || errorMessage;
      } catch (e) {
        // If not JSON, use the text
        errorMessage = errorData || errorMessage;
      }
      
      return Response.json(
        { error: errorMessage, details: errorData, status: backendResponse.status },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    console.log('🏦 [LinkTokenProxy] Backend response data:', data);
    
    // Check if we actually got a link token
    if (!data.link_token) {
      console.error('🏦 [LinkTokenProxy] No link_token in response:', data);
      return Response.json(
        { error: 'No link token received from backend', details: data },
        { status: 500 }
      );
    }
    
    return Response.json(data);
    
  } catch (error) {
    console.error('🏦 [LinkTokenProxy] Proxy error:', error);
    return Response.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}