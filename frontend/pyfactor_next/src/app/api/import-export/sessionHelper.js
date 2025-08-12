import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

/**
 * Get session using the same pattern as session-v2 route
 * This directly validates with backend instead of using frontend proxy
 */
export async function getSession() {
  console.log('🔐 [sessionHelper] === getSession START ===');
  const startTime = Date.now();
  
  try {
    // Get session from cookies
    console.log('🍪 [sessionHelper] Step 1: Getting cookies...');
    const cookieStore = cookies();
    
    // Check all available cookies
    const allCookies = cookieStore.getAll();
    console.log('🍪 [sessionHelper] Available cookies:', {
      count: allCookies.length,
      names: allCookies.map(c => c.name).join(', ')
    });
    
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    const sessionId = sidCookie || sessionTokenCookie;
    
    console.log('🍪 [sessionHelper] Session cookie status:', {
      hasSid: !!sidCookie,
      hasSessionToken: !!sessionTokenCookie,
      sidValue: sidCookie ? sidCookie.value.substring(0, 8) + '...' : 'not found',
      sessionTokenValue: sessionTokenCookie ? sessionTokenCookie.value.substring(0, 8) + '...' : 'not found',
      selectedCookie: sessionId ? sessionId.name : 'none'
    });
    
    if (!sessionId) {
      console.error('❌ [sessionHelper] No session ID found in cookies');
      if (logger && logger.warn) {
        logger.warn('No session ID found in import-export');
      }
      return null;
    }

    // Validate session with backend directly (same pattern as session-v2)
    console.log('🎯 [sessionHelper] Step 2: Validating session with backend...');
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const sessionUrl = `${API_URL}/api/sessions/validate/${sessionId.value}/`;
    
    console.log('🎯 [sessionHelper] Backend URL:', sessionUrl);
    console.log('🎯 [sessionHelper] Session ID to validate:', sessionId.value.substring(0, 8) + '...');
    
    const validationStartTime = Date.now();
    const sessionResponse = await fetch(sessionUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Dott-SessionHelper/1.0'
      },
      cache: 'no-store' // Never cache session data
    });
    
    const validationTime = Date.now() - validationStartTime;
    console.log(`🎯 [sessionHelper] Backend responded in ${validationTime}ms`);

    console.log('🎯 [sessionHelper] Backend validation response:', {
      status: sessionResponse.status,
      ok: sessionResponse.ok,
      statusText: sessionResponse.statusText,
      contentType: sessionResponse.headers.get('content-type')
    });

    if (!sessionResponse.ok) {
      console.error('❌ [sessionHelper] Backend validation failed');
      
      // Get error details
      let errorDetails = '';
      let errorType = 'unknown';
      
      try {
        const responseContentType = sessionResponse.headers.get('content-type');
        console.log('❌ [sessionHelper] Error content-type:', responseContentType);
        
        if (responseContentType && responseContentType.includes('application/json')) {
          const errorData = await sessionResponse.json();
          errorDetails = errorData.error || errorData.detail || JSON.stringify(errorData);
          console.error('❌ [sessionHelper] JSON error:', errorData);
        } else {
          const errorText = await sessionResponse.text();
          console.error('❌ [sessionHelper] Text error:', errorText.substring(0, 500));
          errorDetails = `Non-JSON response: ${sessionResponse.status} ${responseContentType}`;
          
          // Handle specific error types
          if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html>')) {
            errorDetails = 'Backend returned HTML error page instead of JSON';
            errorType = 'html_response';
          } else if (errorText.includes('502 Bad Gateway') || errorText.includes('504 Gateway')) {
            errorDetails = 'Backend service temporarily unavailable';
            errorType = 'gateway_error';
          } else if (errorText.includes('403 Forbidden')) {
            errorDetails = 'Session validation endpoint access denied';
            errorType = 'forbidden';
          } else if (sessionResponse.status === 404) {
            errorDetails = 'Session not found or expired';
            errorType = 'not_found';
          }
        }
      } catch (e) {
        errorDetails = `Failed to parse error response: ${e.message}`;
        errorType = 'parse_error';
        console.error('❌ [sessionHelper] Error parsing response:', e);
      }
      
      console.error('❌ [sessionHelper] Validation error summary:', {
        status: sessionResponse.status,
        errorType,
        errorDetails,
        sessionId: sessionId.value.substring(0, 8) + '...'
      });
      
      if (logger && logger.warn) {
        logger.warn('[sessionHelper] Backend validation failed', {
          status: sessionResponse.status,
          error: errorDetails,
          sessionId: sessionId.value.substring(0, 8) + '...'
        });
      }
      return null;
    }

    // Step 3: Parse session data
    console.log('📦 [sessionHelper] Step 3: Parsing session data...');
    let sessionData;
    try {
      const responseContentType = sessionResponse.headers.get('content-type');
      
      if (responseContentType && responseContentType.includes('application/json')) {
        sessionData = await sessionResponse.json();
        console.log('✅ [sessionHelper] Session data parsed successfully');
        console.log('📦 [sessionHelper] Session data structure:', {
          hasUser: !!sessionData.user,
          hasToken: !!sessionData.session_token,
          hasTenant: !!sessionData.tenant,
          keys: Object.keys(sessionData),
          userKeys: sessionData.user ? Object.keys(sessionData.user) : []
        });
        
        if (sessionData.user) {
          console.log('👤 [sessionHelper] User details:', {
            id: sessionData.user.id,
            email: sessionData.user.email,
            role: sessionData.user.role,
            hasBusinessName: !!sessionData.user.business_name,
            hasTenantId: !!(sessionData.user.tenant_id || sessionData.tenant?.id)
          });
        }
      } else {
        const responseText = await sessionResponse.text();
        console.error('❌ [sessionHelper] Backend returned non-JSON response:', {
          status: sessionResponse.status,
          contentType: responseContentType,
          text: responseText.substring(0, 500)
        });
        throw new Error('Backend returned non-JSON response');
      }
    } catch (parseError) {
      console.error('❌ [sessionHelper] Failed to parse session response:', parseError);
      if (logger && logger.error) {
        logger.error('[sessionHelper] Session response parse error', parseError);
      }
      return null;
    }
    
    // Step 4: Format session data
    console.log('🎯 [sessionHelper] Step 4: Formatting session data...');
    const userData = sessionData.user || sessionData;
    const tenantData = sessionData.tenant || {};
    
    const formattedSession = { 
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        given_name: userData.given_name || userData.first_name,
        family_name: userData.family_name || userData.last_name,
        first_name: userData.first_name || userData.given_name,
        last_name: userData.last_name || userData.family_name,
        businessName: tenantData.name || userData.business_name || sessionData.business_name,
        business_name: tenantData.name || userData.business_name || sessionData.business_name,
        subscriptionPlan: sessionData.subscription_plan || tenantData.subscription_plan || userData.subscription_plan || 'free',
        subscription_plan: sessionData.subscription_plan || tenantData.subscription_plan || userData.subscription_plan || 'free',
        needsOnboarding: sessionData.needs_onboarding,
        onboardingCompleted: sessionData.onboarding_completed || false,
        tenantId: sessionData.tenant_id || tenantData.id,
        tenant_id: sessionData.tenant_id || tenantData.id,
        role: userData.role || sessionData.role || 'USER'
      },
      token: sessionId.value,
      sid: sessionId.value,
      authenticated: true
    };
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ [sessionHelper] Session retrieved successfully in ${totalTime}ms`);
    console.log('🔐 [sessionHelper] === getSession END ===');
    
    return formattedSession;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [sessionHelper] Error getting session after ${totalTime}ms:`, error);
    console.error('❌ [sessionHelper] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    if (logger && logger.error) {
      logger.error('Error getting session in import-export', error);
    }
    
    console.log('🔐 [sessionHelper] === getSession END (with error) ===');
    return null;
  }
}