import { NextResponse } from 'next/server';
import { standardSecurityHeaders } from '@/utils/responseHeaders';
import { cookies } from 'next/headers';

export async function POST(request, { params }) {
  try {
    // Get session from cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      console.log('[Mark Notification Read API] No session ID found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: standardSecurityHeaders }
      );
    }

    const { notificationId } = params;

    // Forward the request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/api/notifications/user/${notificationId}/mark-read/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `session_token=${sessionId.value}`,
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
    console.error('[Mark Notification Read API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: standardSecurityHeaders }
    );
  }
}