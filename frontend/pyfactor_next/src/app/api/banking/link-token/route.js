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
    
    const backendResponse = await fetch(`${backendUrl}/api/banking/link_token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify(body),
    });

    console.log('🏦 [LinkTokenProxy] Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorData = await backendResponse.text();
      console.error('🏦 [LinkTokenProxy] Backend error:', backendResponse.status, errorData);
      return Response.json(
        { error: `Backend error: ${backendResponse.status}`, details: errorData },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    console.log('🏦 [LinkTokenProxy] Backend response data:', data);
    
    return Response.json(data);
    
  } catch (error) {
    console.error('🏦 [LinkTokenProxy] Proxy error:', error);
    return Response.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}