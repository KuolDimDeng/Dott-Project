import { NextResponse } from 'next/server';
import { standardSecurityHeaders } from '@/utils/responseHeaders';

const adminSecurityHeaders = {
  ...standardSecurityHeaders,
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
};

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Forward the request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/api/notifications/admin/mfa/verify/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        'User-Agent': request.headers.get('user-agent') || 'unknown',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Create the response
    const apiResponse = NextResponse.json(data, { 
      status: response.status,
      headers: adminSecurityHeaders 
    });

    // If MFA verification successful, store tokens in cookies
    if (response.status === 200 && data.access_token) {
      // Store tokens in httpOnly cookies
      apiResponse.cookies.set('admin_access_token', data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 8 * 60 * 60, // 8 hours
      });

      apiResponse.cookies.set('admin_refresh_token', data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      // CSRF token needs to be readable by JavaScript
      apiResponse.cookies.set('admin_csrf_token', data.csrf_token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
      });
    }

    return apiResponse;

  } catch (error) {
    console.error('[Admin MFA Verify API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: adminSecurityHeaders }
    );
  }
}