import { cookies } from 'next/headers';

/**
 * Banking API Proxy - Accounts
 * Proxies bank account requests to Django backend
 * Uses session-based authentication
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return Response.json({ error: 'No session found' }, { status: 401 });
    }

    // Forward request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    console.log('🎯 [Banking API] Fetching from:', `${backendUrl}/api/banking/accounts/`);
    console.log('🎯 [Banking API] Session:', sidCookie.value);
    
    const response = await fetch(`${backendUrl}/api/banking/accounts/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
        'Cache-Control': 'no-cache', // Prevent caching
      },
      cache: 'no-store' // Next.js specific - don't cache this request
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend error:', response.status, errorData);
      return Response.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('🎯 [Banking API] Response data:', {
      count: Array.isArray(data) ? data.length : data.data?.length || 0,
      firstAccount: Array.isArray(data) ? data[0] : data.data?.[0]
    });
    
    return Response.json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return Response.json({ error: 'No session found' }, { status: 401 });
    }

    // Extract account ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const accountId = pathParts[pathParts.length - 1];

    // Forward request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/api/banking/accounts/${accountId}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend error:', response.status, errorData);
      return Response.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('🎯 [Banking API] Response data:', {
      count: Array.isArray(data) ? data.length : data.data?.length || 0,
      firstAccount: Array.isArray(data) ? data[0] : data.data?.[0]
    });
    
    return Response.json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}