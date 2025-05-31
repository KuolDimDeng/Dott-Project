import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getAccessToken } from '@/utils/authUtils';

/**
 * API route for optimized product listing
 * This route proxies requests to the optimized backend endpoint
 * with proper authentication and error handling
 */
export async function GET(request) {
  try {
    // Get session and verify authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get access token
    const accessToken = await getAccessToken(session);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unable to retrieve access token' },
        { status: 401 }
      );
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || 1;
    const is_for_sale = searchParams.get('is_for_sale');
    const min_stock = searchParams.get('min_stock');

    // Build query string for backend
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page);
    if (is_for_sale !== null) queryParams.append('is_for_sale', is_for_sale);
    if (min_stock) queryParams.append('min_stock', min_stock);
    
    const queryString = queryParams.toString();
    
    // Call backend API with proper headers
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/inventory/optimized/products/${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      // Set cache control headers
      cache: 'no-store',
    });

    // Handle response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch products' },
        { status: response.status }
      );
    }

    // Return successful response
    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        // Set cache control headers for the client
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error in optimized products API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}