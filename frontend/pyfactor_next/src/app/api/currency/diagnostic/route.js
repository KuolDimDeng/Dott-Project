import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  console.log('🩺 [Currency Diagnostic] === GET REQUEST START ===');
  
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid')?.value;
    const sessionToken = cookieStore.get('session_token')?.value;
    
    console.log('🩺 [Currency Diagnostic] Cookies found:');
    console.log('🩺 [Currency Diagnostic] - sid:', sessionId ? `${sessionId.substring(0, 8)}...` : 'null');
    console.log('🩺 [Currency Diagnostic] - session_token:', sessionToken ? `${sessionToken.substring(0, 8)}...` : 'null');

    const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';
    const backendUrl = `${BACKEND_URL}/api/currency/diagnostic/`;
    console.log('🩺 [Currency Diagnostic] Backend URL:', backendUrl);
    console.log('🩺 [Currency Diagnostic] BACKEND_URL env:', process.env.BACKEND_URL);
    console.log('🩺 [Currency Diagnostic] NEXT_PUBLIC_BACKEND_URL env:', process.env.NEXT_PUBLIC_BACKEND_URL);
    
    // Try both session cookies
    const cookieHeader = [];
    if (sessionId) cookieHeader.push(`sid=${sessionId}`);
    if (sessionToken) cookieHeader.push(`session_token=${sessionToken}`);
    const cookieString = cookieHeader.join('; ');
    
    console.log('🩺 [Currency Diagnostic] Cookie header to send:', cookieString);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString,
      },
    });

    console.log('🩺 [Currency Diagnostic] Backend response status:', response.status);
    
    // Get response as text first to handle non-JSON responses
    const responseText = await response.text();
    console.log('🩺 [Currency Diagnostic] Response text:', responseText);
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('🩺 [Currency Diagnostic] Backend response data:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error('🩺 [Currency Diagnostic] JSON parse error:', parseError);
      return NextResponse.json(
        { success: false, error: 'Backend returned non-JSON response', response: responseText.substring(0, 500) },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.error('🩺 [Currency Diagnostic] Backend returned error:', data);
      return NextResponse.json(data, { status: response.status });
    }

    console.log('🩺 [Currency Diagnostic] === GET REQUEST SUCCESS ===');
    return NextResponse.json(data);
  } catch (error) {
    console.error('🩺 [Currency Diagnostic] === GET REQUEST ERROR ===');
    console.error('🩺 [Currency Diagnostic] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}