import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET() {
  try {
    console.log('[POS Products API] Starting request to backend');
    
    // Get session cookie for authentication
    const headersList = headers();
    const sessionCookie = headersList.get('cookie');
    
    if (!sessionCookie) {
      console.log('[POS Products API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Forward request to Django backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/inventory/products/`;
    console.log('[POS Products API] Forwarding to:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie,
      },
    });

    console.log('[POS Products API] Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('[POS Products API] Backend error:', errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[POS Products API] Success, returning', data.results?.length || data.length || 0, 'products');

    return NextResponse.json(data);
  } catch (error) {
    console.error('[POS Products API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products from backend' },
      { status: 500 }
    );
  }
}