import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Get session cookie for authentication
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('sid');

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Build query parameters
    const params = new URLSearchParams();

    if (searchParams.get('page')) params.append('page', searchParams.get('page'));
    if (searchParams.get('search')) params.append('search', searchParams.get('search'));
    if (searchParams.get('category')) params.append('category', searchParams.get('category'));
    if (searchParams.get('limit')) params.append('limit', searchParams.get('limit'));

    // Forward request to backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://staging.dottapps.com/backend';
    const response = await fetch(
      `${backendUrl}/api/inventory/store-items/?${params.toString()}`,
      {
        headers: {
          'Cookie': `sid=${sessionCookie.value}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        data,
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('StoreItems API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch catalog' },
      { status: 500 }
    );
  }
}