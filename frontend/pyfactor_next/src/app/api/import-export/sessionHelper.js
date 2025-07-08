import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

export async function getSession() {
  try {
    // Get session from cookies
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session_token')?.value || cookieStore.get('sid')?.value;
    
    console.log('[sessionHelper] Looking for session token');
    console.log('[sessionHelper] Cookies available:', {
      session_token: !!cookieStore.get('session_token'),
      sid: !!cookieStore.get('sid'),
      token: sessionToken ? 'found' : 'not found'
    });
    
    if (!sessionToken) {
      logger.warn('No session token found in import-export');
      return null;
    }

    // Use the local session-v2 endpoint which will handle the backend call
    const host = process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000';
    const sessionUrl = `${host}/api/auth/session-v2`;
    console.log('[sessionHelper] Fetching session from local proxy:', sessionUrl);
    
    const sessionResponse = await fetch(sessionUrl, {
      headers: {
        'Cookie': `session_token=${sessionToken}; sid=${sessionToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('[sessionHelper] Session response:', {
      status: sessionResponse.status,
      ok: sessionResponse.ok
    });

    if (!sessionResponse.ok) {
      logger.warn('Invalid session response in import-export');
      return null;
    }

    const sessionData = await sessionResponse.json();
    console.log('[sessionHelper] Session data retrieved:', {
      hasUser: !!sessionData.user,
      userId: sessionData.user?.id,
      userEmail: sessionData.user?.email
    });
    
    return { 
      user: sessionData.user,
      token: sessionToken,
      sid: sessionToken
    };
  } catch (error) {
    console.error('[sessionHelper] Error getting session:', error);
    logger.error('Error getting session in import-export', error);
    return null;
  }
}