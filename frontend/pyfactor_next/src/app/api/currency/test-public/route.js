import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🌐 [Test Public Proxy] === GET REQUEST START ===');
  
  try {
    const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';
    const backendUrl = `${BACKEND_URL}/api/currency/test-public/`;
    console.log('🌐 [Test Public Proxy] Backend URL:', backendUrl);
    console.log('🌐 [Test Public Proxy] BACKEND_URL env:', process.env.BACKEND_URL);
    console.log('🌐 [Test Public Proxy] NEXT_PUBLIC_BACKEND_URL env:', process.env.NEXT_PUBLIC_BACKEND_URL);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Next.js Currency Test',
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
    console.error('🌐 [Test Public Proxy] Error type:', error.constructor.name);
    console.error('🌐 [Test Public Proxy] Error message:', error.message);
    console.error('🌐 [Test Public Proxy] Error stack:', error.stack);
    console.error('🌐 [Test Public Proxy] Full error object:', error);
    
    // Check if it's a network error
    if (error.message.includes('fetch')) {
      return NextResponse.json(
        { success: false, error: 'Network error - cannot reach backend: ' + error.message },
        { status: 502 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error: ' + error.message, errorType: error.constructor.name },
      { status: 500 }
    );
  }
}