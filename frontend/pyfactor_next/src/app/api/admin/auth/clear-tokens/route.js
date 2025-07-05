import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { standardSecurityHeaders } from '@/utils/responseHeaders';

export async function POST(request) {
  try {
    const cookieStore = cookies();
    
    // Clear all admin tokens
    cookieStore.delete('admin_access_token');
    cookieStore.delete('admin_refresh_token');
    cookieStore.delete('admin_csrf_token');

    return NextResponse.json(
      { success: true },
      { status: 200, headers: standardSecurityHeaders }
    );

  } catch (error) {
    console.error('[Admin Auth Clear] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: standardSecurityHeaders }
    );
  }
}