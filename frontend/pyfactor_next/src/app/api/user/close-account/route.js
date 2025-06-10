import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Enhanced Close Account API Route
 * 
 * This route handles complete account deletion:
 * 1. Validates Auth0 session
 * 2. Deletes user data from backend database
 * 3. Deletes user from Auth0
 * 4. Clears all sessions and cookies
 * 
 * Debug logging is included at each step for troubleshooting
 */

// Helper function to get Auth0 Management API token
async function getAuth0ManagementToken() {
  console.log('[CLOSE_ACCOUNT] Attempting to get Auth0 Management API token');
  
  const auth0Domain = process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', '') || 
                     process.env.AUTH0_DOMAIN || 
                     'auth.dottapps.com';
  
  const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID;
  const clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('[CLOSE_ACCOUNT] Auth0 Management API credentials not configured');
    console.log('[CLOSE_ACCOUNT] Please set AUTH0_MANAGEMENT_CLIENT_ID and AUTH0_MANAGEMENT_CLIENT_SECRET');
    return null;
  }
  
  try {
    const response = await fetch(`https://${auth0Domain}/oauth/token`, {
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
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
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
    
    // 3. Delete from backend database
    console.log('[CLOSE_ACCOUNT] Step 2: Deleting user data from backend database');
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    try {
      const backendResponse = await fetch(`${backendUrl}/api/users/close-account/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.accessToken || ''}`
        },
        body: JSON.stringify({
          reason,
          feedback,
          user_email: user.email,
          user_sub: user.sub
        })
      });
      
      const backendResult = await backendResponse.json();
      
      if (backendResponse.ok) {
        console.log('[CLOSE_ACCOUNT] Backend deletion successful:', backendResult);
      } else {
        console.error('[CLOSE_ACCOUNT] Backend deletion failed:', backendResult);
        // Continue with Auth0 deletion even if backend fails
      }
    } catch (error) {
      console.error('[CLOSE_ACCOUNT] Backend deletion error:', error);
      // Continue with Auth0 deletion
    }
    
    // 4. Delete from Auth0
    console.log('[CLOSE_ACCOUNT] Step 3: Deleting user from Auth0');
    const managementToken = await getAuth0ManagementToken();
    
    if (managementToken) {
      const auth0Domain = process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', '') || 
                         process.env.AUTH0_DOMAIN || 
                         'auth.dottapps.com';
      
      try {
        const deleteResponse = await fetch(
          `https://${auth0Domain}/api/v2/users/${encodeURIComponent(user.sub)}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${managementToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (deleteResponse.ok || deleteResponse.status === 204) {
          console.log('[CLOSE_ACCOUNT] Successfully deleted user from Auth0');
        } else {
          const error = await deleteResponse.text();
          console.error('[CLOSE_ACCOUNT] Failed to delete from Auth0:', error);
        }
      } catch (error) {
        console.error('[CLOSE_ACCOUNT] Auth0 deletion error:', error);
      }
    } else {
      console.warn('[CLOSE_ACCOUNT] Could not delete from Auth0 - no management token');
    }
    
    // 5. Clear all cookies and sessions
    console.log('[CLOSE_ACCOUNT] Step 4: Clearing all cookies and sessions');
    const response = NextResponse.json({ 
      success: true,
      message: 'Account closed successfully',
      debug: {
        steps_completed: [
          'session_validated',
          'backend_deletion_attempted',
          'auth0_deletion_attempted',
          'cookies_cleared'
        ],
        timestamp: new Date().toISOString()
      }
    });
    
    // Clear all auth-related cookies
    const cookiesToClear = [
      'appSession',
      'auth0.is.authenticated',
      'auth0-session',
      'user_tenant_id',
      'onboardingCompleted'
    ];
    
    cookiesToClear.forEach(cookieName => {
      response.cookies.delete(cookieName);
      console.log(`[CLOSE_ACCOUNT] Cleared cookie: ${cookieName}`);
    });
    
    console.log('[CLOSE_ACCOUNT] ========== ACCOUNT DELETION COMPLETE ==========');
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
