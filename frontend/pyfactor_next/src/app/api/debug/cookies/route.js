import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    const cookieInfo = allCookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value.substring(0, 50) + '...', // Truncate for security
      size: cookie.value.length,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: cookie.path,
      domain: cookie.domain
    }));
    
    return NextResponse.json({
      cookieCount: allCookies.length,
      cookies: cookieInfo,
      headers: Object.fromEntries(request.headers.entries()),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}