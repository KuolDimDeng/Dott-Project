import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    // Get search params from the request
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    console.log('[Backend CRM Customers] Fetching from backend...');
    
    // Call backend directly
    const response = await fetch(`${BACKEND_URL}/api/crm/customers/${queryString ? '?' + queryString : ''}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });

    if (!response.ok) {
      console.error('[Backend CRM Customers] Backend error:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch customers' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Backend CRM Customers] Response data:', data);
    
    // Return the data directly - the backend already returns an array
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Backend CRM Customers] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}