import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

/**
 * Get session using the same pattern as session-v2 route
 * This directly validates with backend instead of using frontend proxy
 */
export async function getSession() {
  try {
    // Get session from cookies
    const cookieStore = await cookies();
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
        const errorData = await sessionResponse.json();
        errorDetails = errorData.error || errorData.detail || JSON.stringify(errorData);
      } catch (e) {
        errorDetails = await sessionResponse.text();
      }
      
      logger.warn('[sessionHelper] Backend validation failed', {
        status: sessionResponse.status,
        error: errorDetails,
        sessionId: sessionId.value.substring(0, 8) + '...'
      });
      return null;
    }

    const sessionData = await sessionResponse.json();
    console.log('[sessionHelper] Session data retrieved:', {
      hasUser: !!sessionData.user,
      userId: sessionData.user?.id,
      userEmail: sessionData.user?.email,
      tenantId: sessionData.tenant_id || sessionData.tenant?.id
    });
    
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