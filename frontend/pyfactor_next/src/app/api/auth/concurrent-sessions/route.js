import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Check for concurrent sessions for the current user
 */
export async function GET(request) {
  try {
    // Get session token
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    
    if (!sessionToken) {
      return NextResponse.json({ 
        error: 'No active session' 
      }, { status: 401 });
    }
    
    // Call backend to get concurrent sessions
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    const response = await fetch(`${apiUrl}/api/sessions/active/`, {
      headers: {
        'Authorization': `Session ${sessionToken.value}`
      }
    });
    
    if (!response.ok) {
      console.error('[ConcurrentSessions] Backend error:', response.status);
      return NextResponse.json({ 
        count: 0,
        sessions: [] 
      });
    }
    
    const data = await response.json();
    
    // Return session count and basic info (no sensitive data)
    return NextResponse.json({
      count: data.count || 0,
      current_session_id: data.current_session_id,
      sessions: (data.sessions || []).map(session => ({
        session_id: session.session_id,
        created_at: session.created_at,
        last_activity: session.last_activity,
        ip_address: maskIP(session.ip_address),
        user_agent: session.user_agent?.substring(0, 50) + '...',
        is_current: session.session_id === data.current_session_id
      }))
    });
    
  } catch (error) {
    console.error('[ConcurrentSessions] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to check concurrent sessions' 
    }, { status: 500 });
  }
}

/**
 * Mask IP address for privacy
 */
function maskIP(ip) {
  if (!ip) return 'unknown';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  return 'masked';
}