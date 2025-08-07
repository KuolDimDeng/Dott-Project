import { NextResponse } from 'next/server';
import { standardSecurityHeaders } from '@/utils/responseHeaders';

// Enhanced security headers for admin portal
const adminSecurityHeaders = {
  ...standardSecurityHeaders,
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.dottapps.com wss://api.dottapps.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'Expires': '0'
};

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Forward the request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';
    const fullUrl = `${backendUrl}/api/notifications/admin/login`;
    
    console.log('[Admin Login API] Request details:', {
      url: fullUrl,
      method: 'POST',
      body: { username: body.username, password: '***' }
    });
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        'User-Agent': request.headers.get('user-agent') || 'unknown',
      },
      body: JSON.stringify(body),
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('[Admin Login API] Non-JSON response:', response.status, contentType);
      const text = await response.text();
      console.error('[Admin Login API] Response body:', text.substring(0, 500));
      return NextResponse.json(
        { error: 'Invalid response from backend' },
        { status: 500, headers: adminSecurityHeaders }
      );
    }

    const data = await response.json();

    // Create the response
    const apiResponse = NextResponse.json(data, { 
      status: response.status,
      headers: adminSecurityHeaders 
    });

    // If login successful and not MFA required, store tokens in cookies
    if (response.status === 200 && data.access_token && !data.mfa_required) {
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
    console.error('[Admin Login API] Error:', error);
    console.error('[Admin Login API] Error details:', {
      message: error.message,
      cause: error.cause,
      stack: error.stack
    });
    
    // Provide more specific error messages
    if (error.message.includes('fetch failed')) {
      return NextResponse.json(
        { error: 'Unable to connect to backend server' },
        { status: 503, headers: adminSecurityHeaders }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: adminSecurityHeaders }
    );
  }
}