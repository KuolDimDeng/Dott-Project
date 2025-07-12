import { NextResponse } from 'next/server';
import { standardSecurityHeaders } from '@/utils/responseHeaders';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    // Get session from cookies
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      console.log('[Notifications API] No session ID found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: standardSecurityHeaders }
      );
    }

    // Get query parameters (page, unread_only, etc.)
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    // Forward the request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/api/notifications/user/?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `session_token=${sessionId.value}`,
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        'User-Agent': request.headers.get('user-agent') || 'unknown',
      },
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('[User Notifications API] Non-JSON response:', response.status, contentType);
      return NextResponse.json(
        { error: 'Invalid response from backend', notifications: [] },
        { status: 200, headers: standardSecurityHeaders }
      );
    }

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