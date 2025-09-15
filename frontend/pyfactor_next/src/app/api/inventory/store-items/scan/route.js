import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get('barcode');

    if (!barcode) {
      return NextResponse.json(
        { error: 'Barcode parameter is required' },
        { status: 400 }
      );
    }

    // Get session cookie for authentication
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('sid');

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Forward request to backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://staging.dottapps.com/backend';
    const response = await fetch(
      `${backendUrl}/api/inventory/store-items/scan/?barcode=${encodeURIComponent(barcode)}`,
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
    console.error('StoreItems scan API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product information' },
      { status: 500 }
    );
  }
}