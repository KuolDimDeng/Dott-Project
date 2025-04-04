import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getAccessToken } from '@/utils/authUtils';

/**
 * API route for optimized product summary
 * This route proxies requests to the optimized backend summary endpoint
 * with proper authentication and error handling
 */
export async function GET(request) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
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
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/inventory/optimized/products/summary/`;
    
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
        { error: errorData.error || 'Failed to fetch product summary' },
        { status: response.status }
      );
    }

    // Return successful response
    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        // Set cache control headers for the client
        'Cache-Control': 'private, max-age=120, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error in optimized product summary API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}