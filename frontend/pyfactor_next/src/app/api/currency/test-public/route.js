import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🌐 [Test Public Proxy] === GET REQUEST START ===');
  
  try {
    const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';
    const backendUrl = `${BACKEND_URL}/api/currency/test-public/`;
    console.log('🌐 [Test Public Proxy] Backend URL:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('🌐 [Test Public Proxy] Backend response status:', response.status);
    
    // Get response as text first to handle non-JSON responses
    const responseText = await response.text();
    console.log('🌐 [Test Public Proxy] Response text (first 500 chars):', responseText.substring(0, 500));
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('🌐 [Test Public Proxy] Backend response data:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error('🌐 [Test Public Proxy] JSON parse error:', parseError);
      console.error('🌐 [Test Public Proxy] Full response text:', responseText);
      return NextResponse.json(
        { success: false, error: 'Backend returned non-JSON response', response: responseText.substring(0, 200) },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.error('🌐 [Test Public Proxy] Backend returned error:', data);
      return NextResponse.json(
        { success: false, error: data.error || 'Public test failed' },
        { status: response.status }
      );
    }

    console.log('🌐 [Test Public Proxy] === GET REQUEST SUCCESS ===');
    return NextResponse.json(data);
  } catch (error) {
    console.error('🌐 [Test Public Proxy] === GET REQUEST ERROR ===');
    console.error('🌐 [Test Public Proxy] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}