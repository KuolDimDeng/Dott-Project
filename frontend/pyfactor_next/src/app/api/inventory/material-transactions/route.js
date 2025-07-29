import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request) {
  console.log('🎯 [Materials API] GET /api/inventory/material-transactions - fetching transactions');
  
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
    
    const response = await fetch(`${BACKEND_URL}/api/inventory/material-transactions/${queryString ? '?' + queryString : ''}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        data,
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching material transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}