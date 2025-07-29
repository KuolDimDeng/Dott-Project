import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  console.log('🧪 [Test Auth Proxy] === GET REQUEST START ===');
  
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid')?.value;
    const sessionToken = cookieStore.get('session_token')?.value;
    
    console.log('🧪 [Test Auth Proxy] Cookies found:');
    console.log('🧪 [Test Auth Proxy] - sid:', sessionId ? `${sessionId.substring(0, 8)}...` : 'null');
    console.log('🧪 [Test Auth Proxy] - session_token:', sessionToken ? `${sessionToken.substring(0, 8)}...` : 'null');

    const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';
    const backendUrl = `${BACKEND_URL}/api/currency/test-auth/`;
    console.log('🧪 [Test Auth Proxy] Backend URL:', backendUrl);
    
    // Try both session cookies
    const cookieHeader = [];
    if (sessionId) cookieHeader.push(`sid=${sessionId}`);
    if (sessionToken) cookieHeader.push(`session_token=${sessionToken}`);
    const cookieString = cookieHeader.join('; ');
    
    console.log('🧪 [Test Auth Proxy] Cookie header to send:', cookieString);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString,
      },
    });

    console.log('🧪 [Test Auth Proxy] Backend response status:', response.status);
    const data = await response.json();
    console.log('🧪 [Test Auth Proxy] Backend response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('🧪 [Test Auth Proxy] Backend returned error:', data);
      return NextResponse.json(
        { success: false, error: data.error || 'Auth test failed' },
        { status: response.status }
      );
    }

    console.log('🧪 [Test Auth Proxy] === GET REQUEST SUCCESS ===');
    return NextResponse.json(data);
  } catch (error) {
    console.error('🧪 [Test Auth Proxy] === GET REQUEST ERROR ===');
    console.error('🧪 [Test Auth Proxy] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}