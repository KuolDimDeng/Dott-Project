import { NextResponse } from 'next/server';
import { standardSecurityHeaders } from '@/utils/responseHeaders';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Forward the request to Django backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/notifications/admin/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        'User-Agent': request.headers.get('user-agent') || 'unknown',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { 
      status: response.status,
      headers: standardSecurityHeaders 
    });

  } catch (error) {
    console.error('[Admin Login API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: standardSecurityHeaders }
    );
  }
}