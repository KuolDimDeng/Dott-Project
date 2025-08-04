import { NextResponse } from 'next/server';

export async function GET(request) {
  console.log('💠 [Currency V2] === GET REQUEST START ===');
  
  try {
    // Use environment variable for backend URL
    const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${BACKEND_URL}/api/currency/preferences/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      credentials: 'include'
    });
    
    console.log('💠 [Currency V2] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('💠 [Currency V2] Error response:', errorText.substring(0, 500));
      return NextResponse.json(
        { error: 'Failed to fetch preferences', status: response.status },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('💠 [Currency V2] Request error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  console.log('💠 [Currency V2] === PUT REQUEST START ===');
  
  try {
    const body = await request.json();
    console.log('💠 [Currency V2] Request body:', body);
    
    // Use environment variable for backend URL
    const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${BACKEND_URL}/api/currency/preferences/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
      credentials: 'include'
    });
    
    console.log('💠 [Currency V2] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('💠 [Currency V2] Error response:', errorText.substring(0, 500));
      return NextResponse.json(
        { error: 'Failed to update preferences', status: response.status },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('💠 [Currency V2] Request error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}