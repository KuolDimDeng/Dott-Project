import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    console.log('[Onboarding Status] Cookie check:', {
      hasSid: !!sidCookie,
      cookieName: 'sid'
    });
    
    if (!sidCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Make backend request with proper headers
    const backendUrl = `${BACKEND_URL}/api/onboarding/status/`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Add Cloudflare headers
        'CF-Connecting-IP': request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || '',
        'CF-Ray': request.headers.get('CF-Ray') || '',
      },
      cache: 'no-store',
      // Important: don't verify SSL in development
      ...(process.env.NODE_ENV === 'development' ? { rejectUnauthorized: false } : {})
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Onboarding Status] Backend error:', {
        status: response.status,
        error: errorText
      });
      
      return NextResponse.json({ 
        error: 'Backend request failed',
        status: response.status 
      }, { status: response.status });
    }
    
    const data = await response.json();
    
    // Return standardized response
    if (data.success && data.data) {
      return NextResponse.json({
        onboarding_status: data.data.onboarding_status,
        onboarding_completed: data.data.onboarding_completed,
        needs_onboarding: !data.data.onboarding_completed,
        source: 'backend'
      });
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Onboarding Status] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
