import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { standardSecurityHeaders } from '@/utils/responseHeaders';

const adminSecurityHeaders = {
  ...standardSecurityHeaders,
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
};

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const refreshToken = cookieStore.get('admin_refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token found' },
        { status: 401, headers: adminSecurityHeaders }
      );
    }
    
    // Forward the request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/api/notifications/admin/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await response.json();

    // If refresh successful, update access token
    if (response.status === 200 && data.access_token) {
      cookieStore.set('admin_access_token', data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 8 * 60 * 60, // 8 hours
      });
    }

    return NextResponse.json(data, { 
      status: response.status,
      headers: adminSecurityHeaders 
    });

  } catch (error) {
    console.error('[Admin Refresh API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: adminSecurityHeaders }
    );
  }
}