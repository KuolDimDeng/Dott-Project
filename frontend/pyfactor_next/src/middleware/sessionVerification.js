/**
 * Session Verification Middleware
 * Ensures session cookies are properly set and verified before allowing access
 */

export async function verifySessionCookie(maxAttempts = 10, delayMs = 300) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Check for session cookie or status cookie
    const cookies = document.cookie.split(';').map(c => c.trim());
    const hasSessionCookie = cookies.some(cookie => 
      cookie.startsWith('dott_auth_session=') || 
      cookie.startsWith('appSession=') ||
      cookie.startsWith('onboarding_status=')
    );
    
    // Also check for the status cookie which is set immediately
    const statusCookie = cookies.find(cookie => cookie.startsWith('onboarding_status='));
    if (statusCookie) {
      try {
        const statusData = JSON.parse(decodeURIComponent(statusCookie.split('=')[1]));
        if (statusData.hasSession) {
          console.log('[SessionVerification] Found status cookie, session should be available');
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    // Try to verify session even if we don't see the cookie yet
    // (it might be a domain/path issue)
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.user && data.authenticated) {
          console.log('[SessionVerification] Session verified successfully');
          return true;
        }
      }
    } catch (error) {
      console.error('[SessionVerification] Error verifying session:', error);
    }
    
    // Wait before next attempt
    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.log('[SessionVerification] Failed to verify session after', maxAttempts, 'attempts');
  return false;
}

export async function waitForSessionPropagation(sessionData, maxWaitTime = 5000) {
  const startTime = Date.now();
  
  // Set a temporary marker to indicate session is being established
  sessionStorage.setItem('sessionPending', JSON.stringify({
    ...sessionData,
    timestamp: startTime
  }));
  
  while (Date.now() - startTime < maxWaitTime) {
    // Check if session cookie is set
    const isSessionValid = await verifySessionCookie(1, 0);
    
    if (isSessionValid) {
      // Clean up temporary storage
      sessionStorage.removeItem('sessionPending');
      return true;
    }
    
    // Wait 200ms before checking again
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Session verification timed out
  console.error('[SessionVerification] Session cookie verification timed out');
  sessionStorage.removeItem('sessionPending');
  return false;
}

export function getSessionFromStorage() {
  // Check for pending session in sessionStorage
  const pendingSession = sessionStorage.getItem('pendingSession');
  if (pendingSession) {
    try {
      const data = JSON.parse(pendingSession);
      // Check if session is not too old (5 minutes)
      if (Date.now() - data.timestamp < 300000) {
        return data;
      }
      // Clean up old session data
      sessionStorage.removeItem('pendingSession');
    } catch (error) {
      console.error('[SessionVerification] Error parsing pending session:', error);
      sessionStorage.removeItem('pendingSession');
    }
  }
  return null;
}