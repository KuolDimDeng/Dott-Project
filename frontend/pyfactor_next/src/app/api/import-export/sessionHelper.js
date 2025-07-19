import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

/**
 * Get session using the same pattern as session-v2 route
 * This directly validates with backend instead of using frontend proxy
 */
export async function getSession() {
  try {
    // Get session from cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid') || cookieStore.get('session_token');
    
    console.log('[sessionHelper] Looking for session ID');
    console.log('[sessionHelper] Cookies available:', {
      sid: !!cookieStore.get('sid'),
      session_token: !!cookieStore.get('session_token'),
      found: sessionId ? 'found' : 'not found'
    });
    
    if (!sessionId) {
      logger.warn('No session ID found in import-export');
      return null;
    }

    // Validate session with backend directly (same pattern as session-v2)
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dott-api-y26w.onrender.com';
    const sessionUrl = `${API_URL}/api/sessions/validate/${sessionId.value}/`;
    
    console.log('[sessionHelper] Validating session with backend:', sessionUrl);
    
    const sessionResponse = await fetch(sessionUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      cache: 'no-store' // Never cache session data
    });

    console.log('[sessionHelper] Backend validation response:', {
      status: sessionResponse.status,
      ok: sessionResponse.ok
    });

    if (!sessionResponse.ok) {
      // Get error details
      let errorDetails = '';
      try {
        const responseContentType = sessionResponse.headers.get('content-type');
        console.log('[sessionHelper] Backend error response content-type:', responseContentType);
        
        if (responseContentType && responseContentType.includes('application/json')) {
          const errorData = await sessionResponse.json();
          errorDetails = errorData.error || errorData.detail || JSON.stringify(errorData);
        } else {
          const errorText = await sessionResponse.text();
          console.log('[sessionHelper] Backend returned non-JSON error:', errorText.substring(0, 500));
          errorDetails = `Non-JSON response: ${sessionResponse.status} ${responseContentType}`;
          
          // Handle specific error types
          if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html>')) {
            errorDetails = 'Backend returned HTML error page instead of JSON';
          } else if (errorText.includes('502 Bad Gateway') || errorText.includes('504 Gateway')) {
            errorDetails = 'Backend service temporarily unavailable';
          } else if (errorText.includes('403 Forbidden')) {
            errorDetails = 'Session validation endpoint access denied';
          }
        }
      } catch (e) {
        errorDetails = `Failed to parse error response: ${e.message}`;
      }
      
      logger.warn('[sessionHelper] Backend validation failed', {
        status: sessionResponse.status,
        error: errorDetails,
        sessionId: sessionId.value.substring(0, 8) + '...'
      });
      return null;
    }

    let sessionData;
    try {
      const responseContentType = sessionResponse.headers.get('content-type');
      
      if (responseContentType && responseContentType.includes('application/json')) {
        sessionData = await sessionResponse.json();
        console.log('[sessionHelper] Session data retrieved:', {
          hasUser: !!sessionData.user,
          userId: sessionData.user?.id,
          userEmail: sessionData.user?.email,
          tenantId: sessionData.tenant_id || sessionData.tenant?.id
        });
      } else {
        const responseText = await sessionResponse.text();
        console.error('[sessionHelper] Backend returned non-JSON response:', {
          status: sessionResponse.status,
          contentType: responseContentType,
          text: responseText.substring(0, 500)
        });
        throw new Error('Backend returned non-JSON response');
      }
    } catch (parseError) {
      console.error('[sessionHelper] Failed to parse session response:', parseError);
      logger.error('[sessionHelper] Session response parse error', parseError);
      return null;
    }
    
    // Return session data in same format as session-v2
    const userData = sessionData.user || sessionData;
    const tenantData = sessionData.tenant || {};
    
    return { 
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
      sid: sessionId.value
    };
  } catch (error) {
    console.error('[sessionHelper] Error getting session:', error);
    logger.error('Error getting session in import-export', error);
    return null;
  }
}