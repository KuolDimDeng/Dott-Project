import { NextResponse } from 'next/server';
import { standardSecurityHeaders } from '@/utils/responseHeaders';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401, headers: standardSecurityHeaders }
      );
    }

    // Get query parameters (page, unread_only, etc.)
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    // Forward the request to Django backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/notifications/user/?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        'User-Agent': request.headers.get('user-agent') || 'unknown',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { 
      status: response.status,
      headers: standardSecurityHeaders 
    });

  } catch (error) {
    console.error('[User Notifications API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: standardSecurityHeaders }
    );
  }
}