import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function getSecureSession(request) {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      console.log('[sessionUtils-v2] No session ID found');
      return null;
    }
    
    // Validate session with backend - single source of truth
    const response = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `session_token=${sessionId.value}`
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.log('[sessionUtils-v2] Backend validation failed:', response.status);
      return null;
    }
    
    const sessionData = await response.json();
    
    // Return session in expected format
    return {
      authenticated: true,
      user: sessionData.user || sessionData,
      sessionId: sessionId.value,
      tenantId: sessionData.tenant_id || sessionData.tenantId || sessionData.user?.tenantId
    };
  } catch (error) {
    console.error('[sessionUtils-v2] Error getting session:', error);
    return null;
  }
}

export function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}