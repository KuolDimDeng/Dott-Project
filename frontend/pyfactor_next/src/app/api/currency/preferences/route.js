import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  console.log('📡 [Currency Proxy] === GET REQUEST START ===');
  
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid')?.value;
    const sessionToken = cookieStore.get('session_token')?.value;
    
    console.log('📡 [Currency Proxy] Cookies found:');
    console.log('📡 [Currency Proxy] - sid:', sessionId ? `${sessionId.substring(0, 8)}...` : 'null');
    console.log('📡 [Currency Proxy] - session_token:', sessionToken ? `${sessionToken.substring(0, 8)}...` : 'null');

    const backendUrl = `${process.env.BACKEND_URL}/api/users/api/currency/preferences/`;
    console.log('📡 [Currency Proxy] Backend URL:', backendUrl);
    
    // Try both session cookies
    const cookieHeader = [];
    if (sessionId) cookieHeader.push(`sid=${sessionId}`);
    if (sessionToken) cookieHeader.push(`session_token=${sessionToken}`);
    const cookieString = cookieHeader.join('; ');
    
    console.log('📡 [Currency Proxy] Cookie header to send:', cookieString);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString,
      },
    });

    console.log('📡 [Currency Proxy] Backend response status:', response.status);
    const data = await response.json();
    console.log('📡 [Currency Proxy] Backend response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('📡 [Currency Proxy] Backend returned error:', data);
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to fetch currency preferences' },
        { status: response.status }
      );
    }

    console.log('📡 [Currency Proxy] === GET REQUEST SUCCESS ===');
    return NextResponse.json(data);
  } catch (error) {
    console.error('📡 [Currency Proxy] === GET REQUEST ERROR ===');
    console.error('📡 [Currency Proxy] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  console.log('🚀 [Currency Proxy] === PUT REQUEST START ===');
  console.log('🚀 [Currency Proxy] Request headers:', request.headers);
  
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid')?.value;
    const sessionToken = cookieStore.get('session_token')?.value;
    const body = await request.json();
    
    console.log('🚀 [Currency Proxy] Cookies found:');
    console.log('🚀 [Currency Proxy] - sid:', sessionId ? `${sessionId.substring(0, 8)}...` : 'null');
    console.log('🚀 [Currency Proxy] - session_token:', sessionToken ? `${sessionToken.substring(0, 8)}...` : 'null');
    console.log('🚀 [Currency Proxy] Request body:', JSON.stringify(body, null, 2));

    const backendUrl = `${process.env.BACKEND_URL}/api/users/api/currency/preferences/`;
    console.log('🚀 [Currency Proxy] Backend URL:', backendUrl);
    console.log('🚀 [Currency Proxy] BACKEND_URL env:', process.env.BACKEND_URL);
    
    // Try both session cookies
    const cookieHeader = [];
    if (sessionId) cookieHeader.push(`sid=${sessionId}`);
    if (sessionToken) cookieHeader.push(`session_token=${sessionToken}`);
    const cookieString = cookieHeader.join('; ');
    
    console.log('🚀 [Currency Proxy] Cookie header to send:', cookieString);
    console.log('🚀 [Currency Proxy] Making request to backend...');
    
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString,
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
        'User-Agent': request.headers.get('user-agent') || '',
      },
      body: JSON.stringify(body),
    });

    console.log('🚀 [Currency Proxy] Backend response status:', response.status);
    console.log('🚀 [Currency Proxy] Backend response headers:', response.headers);
    
    const responseText = await response.text();
    console.log('🚀 [Currency Proxy] Backend response text:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('🚀 [Currency Proxy] Backend response parsed:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error('🚀 [Currency Proxy] Failed to parse response as JSON:', parseError);
      console.error('🚀 [Currency Proxy] Raw response:', responseText);
      return NextResponse.json(
        { success: false, error: 'Invalid response from server' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error('🚀 [Currency Proxy] Backend returned error:', data);
      return NextResponse.json(
        { success: false, error: data.error || data.detail || 'Failed to update currency preferences' },
        { status: response.status }
      );
    }

    console.log('🚀 [Currency Proxy] === PUT REQUEST SUCCESS ===');
    return NextResponse.json(data);
  } catch (error) {
    console.error('🚀 [Currency Proxy] === PUT REQUEST ERROR ===');
    console.error('🚀 [Currency Proxy] Error type:', error.constructor.name);
    console.error('🚀 [Currency Proxy] Error message:', error.message);
    console.error('🚀 [Currency Proxy] Error stack:', error.stack);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}