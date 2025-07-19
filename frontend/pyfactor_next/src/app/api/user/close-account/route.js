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
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    if (!sessionCookie) {
      console.error('[CLOSE_ACCOUNT] No session cookie found');
      return NextResponse.json({ 
        error: 'Not authenticated',
        debug: 'No dott_auth_session or appSession cookie found'
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
    
    // Debug log session structure
    console.log('[CLOSE_ACCOUNT] Session structure:', {
      hasAccessToken: !!sessionData.accessToken,
      hasAccess_token: !!sessionData.access_token,
      hasIdToken: !!sessionData.idToken,
      hasId_token: !!sessionData.id_token,
      sessionKeys: Object.keys(sessionData)
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
      
      // Debug log all available fields in sessionData
      console.log('[CLOSE_ACCOUNT] Available session fields:', Object.keys(sessionData));
      console.log('[CLOSE_ACCOUNT] Session data sample:', {
        hasAccessToken: !!sessionData.accessToken,
        hasAccess_token: !!sessionData.access_token,
        hasIdToken: !!sessionData.idToken,
        hasId_token: !!sessionData.id_token,
        tokenPreview: sessionData.access_token ? sessionData.access_token.substring(0, 20) + '...' : 'No access_token',
        accessTokenPreview: sessionData.accessToken ? sessionData.accessToken.substring(0, 20) + '...' : 'No accessToken'
      });
      
      // Try to get the access token from different possible locations
      // First, always try to get a fresh token from the Auth0 SDK
      try {
        console.log('[CLOSE_ACCOUNT] Getting fresh access token from Auth0 SDK...');
        const { getAccessToken } = await import('@auth0/nextjs-auth0/server');
        
        // Try to get access token using Auth0 SDK with the correct audience
        const accessTokenResponse = await getAccessToken(request, {
          authorizationParams: {
            audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com',
            scope: 'openid profile email'
          }
        });
        
        if (accessTokenResponse && accessTokenResponse.accessToken) {
          accessToken = accessTokenResponse.accessToken;
          console.log('[CLOSE_ACCOUNT] Retrieved fresh access token from Auth0 SDK');
          console.log('[CLOSE_ACCOUNT] Access token length:', accessToken.length);
          console.log('[CLOSE_ACCOUNT] Access token preview:', accessToken.substring(0, 50) + '...');
        } else {
          console.log('[CLOSE_ACCOUNT] No access token from Auth0 SDK, checking session...');
          
          // Fallback to session data
          if (sessionData.accessToken) {
            accessToken = sessionData.accessToken;
            console.log('[CLOSE_ACCOUNT] Using sessionData.accessToken');
          } else if (sessionData.access_token) {
            accessToken = sessionData.access_token;
            console.log('[CLOSE_ACCOUNT] Using sessionData.access_token');
          } else if (sessionData.idToken) {
            // Sometimes the access token might be stored as idToken
            accessToken = sessionData.idToken;
            console.log('[CLOSE_ACCOUNT] Using sessionData.idToken as fallback');
          } else if (sessionData.id_token) {
            accessToken = sessionData.id_token;
            console.log('[CLOSE_ACCOUNT] Using sessionData.id_token as fallback');
          }
        }
      } catch (error) {
        console.error('[CLOSE_ACCOUNT] Error getting access token from Auth0 SDK:', error);
        
        // Fallback to session data
        if (sessionData.accessToken) {
          accessToken = sessionData.accessToken;
          console.log('[CLOSE_ACCOUNT] Using sessionData.accessToken (fallback)');
        } else if (sessionData.access_token) {
          accessToken = sessionData.access_token;
          console.log('[CLOSE_ACCOUNT] Using sessionData.access_token (fallback)');
        } else if (sessionData.idToken) {
          accessToken = sessionData.idToken;
          console.log('[CLOSE_ACCOUNT] Using sessionData.idToken (fallback)');
        } else if (sessionData.id_token) {
          accessToken = sessionData.id_token;
          console.log('[CLOSE_ACCOUNT] Using sessionData.id_token (fallback)');
        }
      }
      
      console.log('[CLOSE_ACCOUNT] Final access token:', accessToken ? `Token present (${accessToken.length} chars)` : 'No token');
      console.log('[CLOSE_ACCOUNT] Token starts with:', accessToken ? accessToken.substring(0, 50) + '...' : 'N/A');
      console.log('[CLOSE_ACCOUNT] Backend URL:', `${backendUrl}/api/users/close-account/`);
      
      // If no access token, try to continue without backend deletion
      if (!accessToken) {
        console.error('[CLOSE_ACCOUNT] WARNING: No access token available for backend request');
        deletionResults.errors.push('Backend: No authentication token available');
        // Continue with Auth0 deletion attempt instead of failing
      } else {
        const backendResponse = await fetch(`${backendUrl}/api/users/close-account/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-User-Email': user.email,
            'X-User-Sub': user.sub,
            'X-Tenant-ID': user.tenant_id || user.tenantId || ''
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
      
      console.log('[CLOSE_ACCOUNT] Backend response status:', backendResponse.status);
      console.log('[CLOSE_ACCOUNT] Backend response ok:', backendResponse.ok);
      console.log('[CLOSE_ACCOUNT] Backend result:', backendResult);
      
      if (backendResponse.ok && backendResult.success) {
        console.log('[CLOSE_ACCOUNT] Backend deletion successful:', backendResult);
        deletionResults.backend = true;
        
        // Extract deletion details if available
        if (backendResult.details) {
          deletionResults.auth0 = backendResult.details.auth0_deleted || false;
          deletionResults.auditLogId = backendResult.details.deletion_log_id;
          deletionResults.timestamp = backendResult.details.timestamp;
        }
      } else {
        console.error('[CLOSE_ACCOUNT] Backend deletion failed:', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          result: backendResult,
          headers: Object.fromEntries(backendResponse.headers.entries())
        });
        
        // Log specific details for 403 errors
        if (backendResponse.status === 403) {
          console.error('[CLOSE_ACCOUNT] 403 Forbidden - Authentication/Authorization issue');
          console.error('[CLOSE_ACCOUNT] Token used:', accessToken ? `${accessToken.substring(0, 20)}...` : 'No token');
          console.error('[CLOSE_ACCOUNT] Backend error detail:', backendResult.detail || backendResult.error || 'No detail provided');
        }
        
        deletionResults.errors.push(`Backend: ${backendResult.detail || backendResult.error || `HTTP ${backendResponse.status}`}`);
      }
      } // End of else block for accessToken check
    } catch (error) {
      console.error('[CLOSE_ACCOUNT] Backend deletion error:', error);
      deletionResults.errors.push(`Backend: ${error.message}`);
    }
    
    // 4. Delete from Auth0 (skip if already deleted by backend)
    if (!deletionResults.auth0) {
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
          console.log('[CLOSE_ACCOUNT] IMPORTANT: Auth0 deletion succeeded but backend deletion failed');
          console.log('[CLOSE_ACCOUNT] This means account is NOT fully closed - user data still exists in backend');
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
    } else {
      console.log('[CLOSE_ACCOUNT] Auth0 deletion already handled by backend');
    }
    
    // 5. Clear all cookies and sessions
    console.log('[CLOSE_ACCOUNT] Step 4: Clearing all cookies and sessions');
    console.log('[CLOSE_ACCOUNT] Deletion results summary:', {
      backend: deletionResults.backend,
      auth0: deletionResults.auth0,
      errors: deletionResults.errors
    });
    
    // CRITICAL: Account closure only succeeds if BACKEND deletion succeeds
    // Auth0 deletion alone is NOT sufficient - user data must be marked as deleted in backend
    console.log('[CLOSE_ACCOUNT] === DETERMINING SUCCESS ===');
    console.log('[CLOSE_ACCOUNT] Backend deletion result:', deletionResults.backend);
    console.log('[CLOSE_ACCOUNT] Auth0 deletion result:', deletionResults.auth0);
    console.log('[CLOSE_ACCOUNT] Errors:', deletionResults.errors);
    
    // Check for backend errors
    const hasBackendErrors = deletionResults.errors.some(error => 
      error.includes('Backend:') || error.includes('HTTP 403')
    );
    
    // STRICT SUCCESS CRITERIA: Backend deletion must succeed AND no backend errors
    const backendDeletionSucceeded = deletionResults.backend === true;
    const actualSuccess = backendDeletionSucceeded && !hasBackendErrors;
    
    console.log('[CLOSE_ACCOUNT] SUCCESS DETERMINATION:');
    console.log('[CLOSE_ACCOUNT] - Backend deletion succeeded:', backendDeletionSucceeded);
    console.log('[CLOSE_ACCOUNT] - Has backend errors:', hasBackendErrors);
    console.log('[CLOSE_ACCOUNT] - FINAL SUCCESS:', actualSuccess);
    
    if (!actualSuccess) {
      console.error('[CLOSE_ACCOUNT] ❌ ACCOUNT CLOSURE FAILED');
      console.error('[CLOSE_ACCOUNT] Backend deletion is required but failed');
      console.error('[CLOSE_ACCOUNT] User account remains active and functional');
    } else {
      console.log('[CLOSE_ACCOUNT] ✅ ACCOUNT CLOSURE SUCCEEDED');
      console.log('[CLOSE_ACCOUNT] User account has been properly closed');
    }
    
    const response = NextResponse.json({ 
      success: actualSuccess,
      message: actualSuccess 
        ? 'Your account has been closed successfully. You will not be able to sign in again with these credentials.' 
        : 'Account closure failed. Please contact support.',
      details: {
        account_closed: deletionResults.backend,
        auth0_deleted: deletionResults.auth0,
        audit_log_id: deletionResults.auditLogId,
        timestamp: deletionResults.timestamp || new Date().toISOString()
      },
      debug: {
        steps_completed: [
          'session_validated',
          deletionResults.backend && 'backend_soft_delete_successful',
          deletionResults.auth0 && 'auth0_deletion_successful',
          'cookies_cleared'
        ].filter(Boolean),
        deletion_results: deletionResults,
        errors: deletionResults.errors.length > 0 ? deletionResults.errors : undefined
      }
    });
    
    // Clear all auth-related cookies
    const cookiesToClear = [
      'dott_auth_session',  // New secure cookie
      'appSession',         // Old cookie for compatibility
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
