import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ 
        error: 'No session ID found',
        cookies: {}
      });
    }
    
    console.log('[Debug Session Status] Checking session:', sessionId.value.substring(0, 8) + '...');
    
    // Get raw session data from backend
    const response = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `session_token=${sessionId.value}`
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Backend validation failed',
        status: response.status
      });
    }
    
    const sessionData = await response.json();
    
    // Return raw backend data for debugging
    return NextResponse.json({
      raw_backend_response: sessionData,
      extracted_values: {
        needs_onboarding: sessionData.needs_onboarding,
        onboarding_completed: sessionData.onboarding_completed,
        tenant_id: sessionData.tenant_id,
        user_email: sessionData.email || sessionData.user?.email,
        has_tenant: !!sessionData.tenant_id || !!sessionData.tenant?.id
      },
      debug_info: {
        session_id: sessionId.value.substring(0, 8) + '...',
        api_url: API_URL,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[Debug Session Status] Error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}