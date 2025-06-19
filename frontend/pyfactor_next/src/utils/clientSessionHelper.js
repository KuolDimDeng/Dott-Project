/**
 * Client-side session helper
 * Provides simple session management for client components
 */

export async function getClientSession() {
  console.log('[ClientSessionHelper] Getting session...');
  
  try {
    const response = await fetch('/api/auth/session-v2', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store'
    });

    console.log('[ClientSessionHelper] Response status:', response.status);

    if (!response.ok) {
      if (response.status === 401) {
        console.log('[ClientSessionHelper] No valid session');
        return { authenticated: false, user: null };
      }
      throw new Error(`Session fetch failed: ${response.status}`);
    }

    const sessionData = await response.json();
    console.log('[ClientSessionHelper] Session data:', sessionData);
    
    return {
      authenticated: sessionData.authenticated || false,
      user: sessionData.user || null
    };
  } catch (error) {
    console.error('[ClientSessionHelper] Error fetching session:', error);
    return { authenticated: false, user: null };
  }
}

export async function updateClientSession(updates) {
  console.warn('[ClientSessionHelper] updateClientSession is deprecated in session-v2 system');
  console.warn('[ClientSessionHelper] Session updates are handled server-side automatically');
  console.log('[ClientSessionHelper] Requested updates were:', updates);
  
  // In session-v2 system, just return current session since updates happen server-side
  return await getClientSession();
}