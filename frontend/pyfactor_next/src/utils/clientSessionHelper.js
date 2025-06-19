/**
 * Client-side session helper
 * Provides simple session management for client components
 */

export async function getClientSession() {
  console.log('[ClientSessionHelper] Getting session...');
  
  try {
    const response = await fetch('/api/session', {
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

    const session = await response.json();
    console.log('[ClientSessionHelper] Session data:', session);
    
    return {
      authenticated: true,
      user: {
        email: session.email,
        needsOnboarding: session.needs_onboarding,
        onboardingCompleted: session.onboarding_completed,
        tenantId: session.tenant_id,
        permissions: session.permissions || []
      }
    };
  } catch (error) {
    console.error('[ClientSessionHelper] Error fetching session:', error);
    return { authenticated: false, user: null };
  }
}

export async function updateClientSession(updates) {
  console.log('[ClientSessionHelper] Updating session with:', updates);
  
  try {
    const response = await fetch('/api/session', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Session update failed: ${response.status}`);
    }

    const updatedSession = await response.json();
    console.log('[ClientSessionHelper] Session updated:', updatedSession);
    return updatedSession;
  } catch (error) {
    console.error('[ClientSessionHelper] Error updating session:', error);
    throw error;
  }
}