import { cookies } from 'next/headers';

/**
 * Banking API Proxy - Link Token Creation
 * Proxies requests to Django backend to avoid CORS issues
 * Uses session-based authentication
 */
export async function POST(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return Response.json({ error: 'No session found' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    
    // Forward request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/api/banking/link_token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify(body),
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
    return Response.json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}