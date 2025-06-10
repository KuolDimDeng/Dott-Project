import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Enhanced Close Account API Route
 * 
 * This route handles complete account deletion:
 * 1. Validates Auth0 session
 * 2. Deletes user data from backend database
 * 3. Deletes user from Auth0 (if credentials are configured)
 * 4. Clears all sessions and cookies
 * 
 * Debug logging is included at each step for troubleshooting
 */

// Helper function to get Auth0 Management API token
async function getAuth0ManagementToken() {
  console.log('[CLOSE_ACCOUNT] Attempting to get Auth0 Management API token');
  
  // Get and clean the Auth0 domain
  const auth0DomainRaw = process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', '') || 
                         process.env.AUTH0_DOMAIN || 
                         'auth.dottapps.com';
  
  // Trim whitespace and remove any trailing slashes
  const auth0Domain = auth0DomainRaw.trim().replace(/\/$/, '');
  
  console.log('[CLOSE_ACCOUNT] Using Auth0 domain:', auth0Domain);
  
  const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID?.trim();
  const clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET?.trim();
  
  if (!clientId || !clientSecret) {
    console.error('[CLOSE_ACCOUNT] Auth0 Management API credentials not configured');
    console.log('[CLOSE_ACCOUNT] Please set AUTH0_MANAGEMENT_CLIENT_ID and AUTH0_MANAGEMENT_CLIENT_SECRET');
    console.log('[CLOSE_ACCOUNT] Current values - ClientID exists:', !!clientId, 'ClientSecret exists:', !!clientSecret);
    return null;
  }
  
  try {
    const tokenUrl = `https://${auth0Domain}/oauth/token`;
    console.log('[CLOSE_ACCOUNT] Requesting token from:', tokenUrl);
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        audience: `https://${auth0Domain}/api/v2/`,
        grant_type: 'client_credentials'
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[CLOSE_ACCOUNT] Failed to get Management API token:', error);
      console.error('[CLOSE_ACCOUNT] Response status:', response.status);
      return null;
    }
    
    const data = await response.json();
    console.log('[CLOSE_ACCOUNT] Successfully obtained Management API token');
    return data.access_token;
  } catch (error) {
    console.error('[CLOSE_ACCOUNT] Error getting Management API token:', error);
    return null;
  }
}

export async function POST(request) {
  console.log('[CLOSE_ACCOUNT] ========== STARTING ACCOUNT DELETION PROCESS ==========');
  
  try {
    // 1. Get and validate session
    console.log('[CLOSE_ACCOUNT] Step 1: Validating Auth0 session');
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      console.error('[CLOSE_ACCOUNT] No session cookie found');
      return NextResponse.json({ 
        error: 'Not authenticated',
        debug: 'No appSession cookie found'
      }, { status: 401 });
    }
    
    // Parse session
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (error) {
      console.error('[CLOSE_ACCOUNT] Failed to parse session:', error);
      return NextResponse.json({ 
        error: 'Invalid session',
        debug: 'Failed to parse session data'
      }, { status: 401 });
    }
    
    const user = sessionData.user;
    
    if (!user) {
      console.error('[CLOSE_ACCOUNT] No user data in session');
      return NextResponse.json({ 
        error: 'Invalid session',
        debug: 'Session exists but no user data'
      }, { status: 401 });
    }
    
    console.log('[CLOSE_ACCOUNT] User authenticated:', {
      email: user.email,
      sub: user.sub,
      tenantId: user.tenant_id || user.tenantId
    });
    
    // 2. Get request data
    const requestData = await request.json();
    const { reason, feedback } = requestData;
    
    console.log('[CLOSE_ACCOUNT] Deletion request details:', {
      reason,
      feedback: feedback ? 'Provided' : 'Not provided'
    });
    
    // Track deletion results
    const deletionResults = {
      backend: false,
      auth0: false,
      errors: []
    };
    
    // 3. Delete from backend database
    console.log('[CLOSE_ACCOUNT] Step 2: Deleting user data from backend database');
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    try {
      // Get access token from various possible locations in the session
      let accessToken = '';
      
      // Try to get the access token from different possible locations
      if (sessionData.accessToken) {
        accessToken = sessionData.accessToken;
      } else if (sessionData.idToken) {
        // Sometimes the access token might be stored as idToken
        accessToken = sessionData.idToken;
      } else {
        // Try to get a fresh access token
        try {
          const tokenResponse = await fetch('/api/auth/access-token');
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            accessToken = tokenData.access_token || tokenData.accessToken || tokenData.token || '';
            console.log('[CLOSE_ACCOUNT] Retrieved fresh access token');
          }
        } catch (error) {
          console.error('[CLOSE_ACCOUNT] Failed to get fresh access token:', error);
        }
      }
      
      console.log('[CLOSE_ACCOUNT] Using access token:', accessToken ? 'Token present' : 'No token');
      
      const backendResponse = await fetch(`${backendUrl}/api/users/close-account/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          reason,
          feedback,
          user_email: user.email,
          user_sub: user.sub
        })
      });
      
      const backendText = await backendResponse.text();
      let backendResult;
      
      try {
        backendResult = backendText ? JSON.parse(backendText) : {};
      } catch (e) {
        console.error('[CLOSE_ACCOUNT] Failed to parse backend response:', backendText);
        backendResult = { error: 'Invalid response from backend' };
      }
      
      if (backendResponse.ok) {
        console.log('[CLOSE_ACCOUNT] Backend deletion successful:', backendResult);
        deletionResults.backend = true;
      } else {
        console.error('[CLOSE_ACCOUNT] Backend deletion failed:', backendResult);
        deletionResults.errors.push(`Backend: ${backendResult.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[CLOSE_ACCOUNT] Backend deletion error:', error);
      deletionResults.errors.push(`Backend: ${error.message}`);
    }
    
    // 4. Delete from Auth0
    console.log('[CLOSE_ACCOUNT] Step 3: Attempting to delete user from Auth0');
    const managementToken = await getAuth0ManagementToken();
    
    if (managementToken) {
      const auth0Domain = (process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', '') || 
                          process.env.AUTH0_DOMAIN || 
                          'auth.dottapps.com').trim().replace(/\/$/, '');
      
      try {
        const deleteUrl = `https://${auth0Domain}/api/v2/users/${encodeURIComponent(user.sub)}`;
        console.log('[CLOSE_ACCOUNT] Deleting user from Auth0:', deleteUrl);
        
        const deleteResponse = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${managementToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (deleteResponse.ok || deleteResponse.status === 204) {
          console.log('[CLOSE_ACCOUNT] Successfully deleted user from Auth0');
          deletionResults.auth0 = true;
        } else {
          const error = await deleteResponse.text();
          console.error('[CLOSE_ACCOUNT] Failed to delete from Auth0:', error);
          console.error('[CLOSE_ACCOUNT] Response status:', deleteResponse.status);
          deletionResults.errors.push(`Auth0: ${error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('[CLOSE_ACCOUNT] Auth0 deletion error:', error);
        deletionResults.errors.push(`Auth0: ${error.message}`);
      }
    } else {
      console.warn('[CLOSE_ACCOUNT] Skipping Auth0 deletion - no management token available');
      console.log('[CLOSE_ACCOUNT] This usually means Management API credentials are not configured');
      deletionResults.errors.push('Auth0: Management API credentials not configured');
    }
    
    // 5. Clear all cookies and sessions
    console.log('[CLOSE_ACCOUNT] Step 4: Clearing all cookies and sessions');
    const response = NextResponse.json({ 
      success: deletionResults.backend || deletionResults.auth0,
      message: deletionResults.backend && deletionResults.auth0 
        ? 'Account closed successfully' 
        : deletionResults.backend 
          ? 'Account data deleted from our servers. Auth0 deletion requires additional configuration.'
          : 'Account closure partially completed',
      debug: {
        steps_completed: [
          'session_validated',
          deletionResults.backend && 'backend_deletion_successful',
          deletionResults.auth0 && 'auth0_deletion_successful',
          'cookies_cleared'
        ].filter(Boolean),
        deletion_results: deletionResults,
        timestamp: new Date().toISOString()
      }
    });
    
    // Clear all auth-related cookies
    const cookiesToClear = [
      'appSession',
      'auth0.is.authenticated',
      'auth0-session',
      'user_tenant_id',
      'onboardingCompleted',
      'tenantId'
    ];
    
    cookiesToClear.forEach(cookieName => {
      response.cookies.delete(cookieName);
      console.log(`[CLOSE_ACCOUNT] Cleared cookie: ${cookieName}`);
    });
    
    console.log('[CLOSE_ACCOUNT] ========== ACCOUNT DELETION COMPLETE ==========');
    console.log('[CLOSE_ACCOUNT] Results:', deletionResults);
    return response;
    
  } catch (error) {
    console.error('[CLOSE_ACCOUNT] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to close account',
      message: error.message,
      debug: {
        error_type: error.constructor.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    }, { status: 500 });
  }
}
