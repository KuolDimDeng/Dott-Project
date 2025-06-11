import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Fixed Close Account API Route that works with custom session format
 * This handles the custom authentication flow used by the app
 */

// Helper function to get Auth0 Management API token
async function getAuth0ManagementToken() {
  console.log('[CLOSE_ACCOUNT_FIXED] Attempting to get Auth0 Management API token');
  
  const auth0DomainRaw = process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', '') || 
                         process.env.AUTH0_DOMAIN || 
                         'auth.dottapps.com';
  
  const auth0Domain = auth0DomainRaw.trim().replace(/\/$/, '');
  const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID?.trim();
  const clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET?.trim();
  
  if (!clientId || !clientSecret) {
    console.error('[CLOSE_ACCOUNT_FIXED] Auth0 Management API credentials not configured');
    return null;
  }
  
  try {
    const tokenUrl = `https://${auth0Domain}/oauth/token`;
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
      console.error('[CLOSE_ACCOUNT_FIXED] Failed to get Management API token:', error);
      return null;
    }
    
    const data = await response.json();
    console.log('[CLOSE_ACCOUNT_FIXED] Successfully obtained Management API token');
    return data.access_token;
  } catch (error) {
    console.error('[CLOSE_ACCOUNT_FIXED] Error getting Management API token:', error);
    return null;
  }
}

export async function POST(request) {
  console.log('[CLOSE_ACCOUNT_FIXED] ========== STARTING ACCOUNT DELETION PROCESS ==========');
  
  try {
    // 1. Get and validate session
    console.log('[CLOSE_ACCOUNT_FIXED] Step 1: Validating session');
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      console.error('[CLOSE_ACCOUNT_FIXED] No session cookie found');
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
      console.error('[CLOSE_ACCOUNT_FIXED] Failed to parse session:', error);
      return NextResponse.json({ 
        error: 'Invalid session',
        debug: 'Failed to parse session data'
      }, { status: 401 });
    }
    
    const user = sessionData.user;
    
    if (!user) {
      console.error('[CLOSE_ACCOUNT_FIXED] No user data in session');
      return NextResponse.json({ 
        error: 'Invalid session',
        debug: 'Session exists but no user data'
      }, { status: 401 });
    }
    
    console.log('[CLOSE_ACCOUNT_FIXED] User authenticated:', {
      email: user.email,
      sub: user.sub,
      tenantId: user.tenant_id || user.tenantId
    });
    
    // 2. Get request data
    const requestData = await request.json();
    const { reason, feedback } = requestData;
    
    console.log('[CLOSE_ACCOUNT_FIXED] Deletion request details:', {
      reason,
      feedback: feedback ? 'Provided' : 'Not provided'
    });
    
    // Track deletion results
    const deletionResults = {
      backend: false,
      auth0: false,
      errors: []
    };
    
    // 3. Delete from backend database using the custom session access token
    console.log('[CLOSE_ACCOUNT_FIXED] Step 2: Attempting backend deletion');
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    try {
      // Get access token from custom session format
      const accessToken = sessionData.accessToken || sessionData.access_token;
      
      console.log('[CLOSE_ACCOUNT_FIXED] Access token found:', !!accessToken);
      console.log('[CLOSE_ACCOUNT_FIXED] Token length:', accessToken ? accessToken.length : 0);
      
      if (!accessToken) {
        console.error('[CLOSE_ACCOUNT_FIXED] No access token in session');
        deletionResults.errors.push('Backend: No authentication token available');
      } else {
        console.log('[CLOSE_ACCOUNT_FIXED] Making backend API call to:', `${backendUrl}/api/users/close-account/`);
        
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
          console.error('[CLOSE_ACCOUNT_FIXED] Failed to parse backend response:', backendText);
          backendResult = { error: 'Invalid response from backend' };
        }
        
        console.log('[CLOSE_ACCOUNT_FIXED] Backend response:', {
          status: backendResponse.status,
          ok: backendResponse.ok,
          result: backendResult
        });
        
        if (backendResponse.ok && backendResult.success) {
          console.log('[CLOSE_ACCOUNT_FIXED] ✅ Backend deletion successful');
          deletionResults.backend = true;
          
          if (backendResult.details) {
            deletionResults.auth0 = backendResult.details.auth0_deleted || false;
            deletionResults.auditLogId = backendResult.details.deletion_log_id;
            deletionResults.timestamp = backendResult.details.timestamp;
          }
        } else {
          console.error('[CLOSE_ACCOUNT_FIXED] ❌ Backend deletion failed:', {
            status: backendResponse.status,
            statusText: backendResponse.statusText,
            result: backendResult
          });
          
          if (backendResponse.status === 403) {
            console.error('[CLOSE_ACCOUNT_FIXED] 403 Forbidden - Token validation issue');
            console.error('[CLOSE_ACCOUNT_FIXED] Token preview:', accessToken ? accessToken.substring(0, 50) + '...' : 'No token');
          }
          
          deletionResults.errors.push(`Backend: ${backendResult.detail || backendResult.error || `HTTP ${backendResponse.status}`}`);
        }
      }
    } catch (error) {
      console.error('[CLOSE_ACCOUNT_FIXED] Backend deletion error:', error);
      deletionResults.errors.push(`Backend: ${error.message}`);
    }
    
    // 4. Delete from Auth0 if backend didn't handle it
    if (!deletionResults.auth0) {
      console.log('[CLOSE_ACCOUNT_FIXED] Step 3: Attempting Auth0 deletion');
      const managementToken = await getAuth0ManagementToken();
      
      if (managementToken) {
        const auth0Domain = (process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', '') || 
                            process.env.AUTH0_DOMAIN || 
                            'auth.dottapps.com').trim().replace(/\/$/, '');
        
        try {
          const deleteUrl = `https://${auth0Domain}/api/v2/users/${encodeURIComponent(user.sub)}`;
          console.log('[CLOSE_ACCOUNT_FIXED] Deleting user from Auth0:', deleteUrl);
          
          const deleteResponse = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${managementToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (deleteResponse.ok || deleteResponse.status === 204) {
            console.log('[CLOSE_ACCOUNT_FIXED] ✅ Successfully deleted user from Auth0');
            deletionResults.auth0 = true;
          } else {
            const error = await deleteResponse.text();
            console.error('[CLOSE_ACCOUNT_FIXED] ❌ Failed to delete from Auth0:', error);
            deletionResults.errors.push(`Auth0: ${error || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('[CLOSE_ACCOUNT_FIXED] Auth0 deletion error:', error);
          deletionResults.errors.push(`Auth0: ${error.message}`);
        }
      } else {
        console.warn('[CLOSE_ACCOUNT_FIXED] Skipping Auth0 deletion - no management token');
        deletionResults.errors.push('Auth0: Management API credentials not configured');
      }
    }
    
    // 5. Determine success
    console.log('[CLOSE_ACCOUNT_FIXED] === DETERMINING SUCCESS ===');
    console.log('[CLOSE_ACCOUNT_FIXED] Backend deletion:', deletionResults.backend);
    console.log('[CLOSE_ACCOUNT_FIXED] Auth0 deletion:', deletionResults.auth0);
    console.log('[CLOSE_ACCOUNT_FIXED] Errors:', deletionResults.errors);
    
    // Success only if backend deletion succeeded
    const success = deletionResults.backend === true;
    
    console.log('[CLOSE_ACCOUNT_FIXED] FINAL RESULT:', success ? '✅ SUCCESS' : '❌ FAILED');
    
    const response = NextResponse.json({ 
      success,
      message: success 
        ? 'Your account has been closed successfully. You will not be able to sign in again with these credentials.' 
        : 'Account closure failed. Please contact support.',
      details: {
        account_closed: deletionResults.backend,
        auth0_deleted: deletionResults.auth0,
        audit_log_id: deletionResults.auditLogId,
        timestamp: deletionResults.timestamp || new Date().toISOString()
      },
      debug: {
        deletion_results: deletionResults,
        errors: deletionResults.errors.length > 0 ? deletionResults.errors : undefined
      }
    });
    
    // Clear cookies if successful
    if (success) {
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
      });
    }
    
    console.log('[CLOSE_ACCOUNT_FIXED] ========== ACCOUNT DELETION COMPLETE ==========');
    return response;
    
  } catch (error) {
    console.error('[CLOSE_ACCOUNT_FIXED] Unexpected error:', error);
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