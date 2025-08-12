import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    
    // Get request headers for debugging
    const headers = {};
    request.headers.forEach((value, key) => {
      if (key.toLowerCase().includes('cookie') || key.toLowerCase().includes('host')) {
        headers[key] = value;
      }
    });
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      host: request.headers.get('host'),
      cookies: {
        sid: sidCookie ? {
          exists: true,
          value: sidCookie.value.substring(0, 8) + '...',
          length: sidCookie.value.length
        } : { exists: false },
        session_token: sessionTokenCookie ? {
          exists: true,
          value: sessionTokenCookie.value.substring(0, 8) + '...',
          length: sessionTokenCookie.value.length
        } : { exists: false },
        all_cookies: allCookies.map(c => ({
          name: c.name,
          value_length: c.value.length,
          preview: c.value.substring(0, 8) + '...'
        }))
      },
      headers,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL
      }
    };
    
    return NextResponse.json(debugInfo, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Debug check failed',
      message: error.message
    }, { status: 500 });
  }
}