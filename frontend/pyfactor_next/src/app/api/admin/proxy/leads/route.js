import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    console.log('🎯 [AdminLeadsProxy] === GET LEADS LIST START ===');
    
    // Get search params for filtering/pagination
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}/api/leads/${queryString ? `?${queryString}` : ''}`;
    
    console.log('🎯 [AdminLeadsProxy] Backend URL:', backendUrl);
    
    // Forward the request to Django backend
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies for authentication
        'Cookie': request.headers.get('cookie') || '',
      },
    });
    
    console.log('🎯 [AdminLeadsProxy] Backend response status:', backendResponse.status);
    
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('🎯 [AdminLeadsProxy] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch leads from backend' },
        { status: backendResponse.status }
      );
    }
    
    const data = await backendResponse.json();
    console.log('🎯 [AdminLeadsProxy] Successfully fetched leads, count:', data.results?.length || data.length || 'unknown');
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('🎯 [AdminLeadsProxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    console.log('🎯 [AdminLeadsProxy] === CREATE LEAD START ===');
    
    const body = await request.json();
    console.log('🎯 [AdminLeadsProxy] Request body:', body);
    
    const backendUrl = `${BACKEND_URL}/api/leads/create/`;
    console.log('🎯 [AdminLeadsProxy] Backend URL:', backendUrl);
    
    // Forward the request to Django backend
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies for authentication
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    });
    
    console.log('🎯 [AdminLeadsProxy] Backend response status:', backendResponse.status);
    
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('🎯 [AdminLeadsProxy] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to create lead' },
        { status: backendResponse.status }
      );
    }
    
    const data = await backendResponse.json();
    console.log('🎯 [AdminLeadsProxy] Successfully created lead:', data);
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('🎯 [AdminLeadsProxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}