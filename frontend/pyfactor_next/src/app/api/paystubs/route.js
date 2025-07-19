import { cookies } from 'next/headers';

/**
 * Get employee pay stubs
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return Response.json({ error: 'No session found' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear();
    
    // Forward request to Django backend
    const backendUrl = process.env.BACKEND_URL || 'https://dott-api-v1.onrender.com';
    const response = await fetch(`${backendUrl}/api/payroll/paystubs/?year=${year}`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sidCookie.value}`,
        'User-Agent': 'Dott-Frontend/1.0'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend error:', response.status, errorData);
      return Response.json(
        { error: errorData || 'Failed to fetch pay stubs' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return Response.json(result);
    
  } catch (error) {
    console.error('Proxy error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}