import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getAccessToken } from '@/utils/authUtils';

/**
 * API route for optimized product detail
 * This route proxies requests to the optimized backend detail endpoint
 * with proper authentication and error handling
 */
export async function GET(request, { params }) {
  try {
    // Get product ID from route params (properly awaited for Next.js 15+)
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

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
    
    // Call backend API with proper headers
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/inventory/optimized/products/${id}/`;
    
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
      
      // Handle 404 specifically
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch product details' },
        { status: response.status }
      );
    }

    // Return successful response
    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        // Set cache control headers for the client
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=900',
      },
    });
  } catch (error) {
    console.error('Error in optimized product detail API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}