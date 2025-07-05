import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { encrypt, decrypt } from '@/utils/sessionEncryption';
import { logger } from '@/utils/logger';

export async function POST(request) {
  try {
    console.log('[SetupComplete] Processing onboarding completion request');
    
    // Get Auth0 session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No Auth0 session found' }, { status: 401 });
    }
    
    let sessionData;
    try {
      // Try to decrypt first (new format)
      if (sessionCookie.name === 'dott_auth_session') {
        const decrypted = decrypt(sessionCookie.value);
        sessionData = JSON.parse(decrypted);
      } else {
        // Fall back to base64 (old format)
        sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      }
    } catch (parseError) {
      logger.error('[SetupComplete] Failed to parse session:', parseError);
      return NextResponse.json({ error: 'Invalid session data' }, { status: 401 });
    }
    
    const { user, accessToken } = sessionData;
    const userEmail = user?.email;
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found in session' }, { status: 401 });
    }
    
    console.log('[SetupComplete] Completing onboarding for user:', userEmail);
    
    const completedAt = new Date().toISOString();
    
    // Get business info from session storage or request body
    const body = await request.json();
    const businessInfo = body.businessInfo || {};
    
    // Call the consolidated onboarding completion endpoint instead
    let backendUpdateSuccessful = false;
    let tenantId = null;
    
    try {
      console.log('[SetupComplete] Calling consolidated onboarding completion');
      
      // Use internal API call to complete onboarding
      const onboardingResponse = await fetch(new URL('/api/onboarding/complete-all', request.url).href, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          businessName: businessInfo.businessName || user.businessName || 'My Business',
          businessType: businessInfo.businessType || 'General Business',
          country: businessInfo.country || 'United States',
          businessState: businessInfo.state || '',
          legalStructure: businessInfo.legalStructure || 'Sole Proprietorship',
          selectedPlan: 'free',
          billingCycle: 'monthly',
          role: 'owner',
          onboarding_completed: true,
          onboarding_completed_at: completedAt
        })
      });
      
      console.log('[SetupComplete] Onboarding response status:', onboardingResponse.status);
      
      if (onboardingResponse.ok) {
        const result = await onboardingResponse.json();
        console.log('[SetupComplete] ✅ Onboarding completion successful:', result);
        backendUpdateSuccessful = true;
        
        // Store tenant ID from the result
        tenantId = result.tenant_id || result.tenantId;
        if (tenantId) {
          sessionData.tenantId = tenantId;
          console.log('[SetupComplete] Got tenant ID from onboarding:', tenantId);
        }
      } else {
        const errorText = await onboardingResponse.text();
        console.error('[SetupComplete] ❌ Onboarding completion failed:', {
          status: onboardingResponse.status,
          statusText: onboardingResponse.statusText,
          error: errorText
        });
      }
    } catch (backendError) {
      console.error('[SetupComplete] ❌ Error calling onboarding completion:', backendError.message);
    }
    
    // Update Auth0 session cookie (critical for immediate session updates)
    try {
      const updatedSessionData = {
        ...sessionData,
        user: {
          ...sessionData.user,
          needsOnboarding: false,
          onboardingCompleted: true,
          onboarding_completed: true,
          needs_onboarding: false,
          currentStep: 'completed',
          current_onboarding_step: 'completed',
          setupCompletedAt: completedAt,
          lastUpdated: completedAt,
          tenantId: tenantId || sessionData.tenantId // Include tenant ID
        }
      };
      
      // Encrypt the updated session data
      const encryptedSession = encrypt(JSON.stringify(updatedSessionData));
      
      const response = NextResponse.json({
        success: true,
        message: 'Onboarding completion recorded successfully',
        onboarding_completed: true,
        needs_onboarding: false,
        current_step: 'completed',
        setup_completed_at: completedAt,
        backend_updated: backendUpdateSuccessful,
        tenantId: tenantId || sessionData.tenantId // Include tenant ID in response
      });
      
      // Update session cookie with new onboarding status (encrypted format)
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
      };
      
      response.cookies.set('dott_auth_session', encryptedSession, cookieOptions);
      response.cookies.set('appSession', encryptedSession, cookieOptions);
      
      // Set onboarding completion indicators
      response.cookies.set('onboarding_just_completed', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 5, // 5 minutes
        path: '/'
      });
      
      response.cookies.set('onboarding_status', JSON.stringify({
        completed: true,
        tenantId: tenantId || sessionData.tenantId,
        timestamp: completedAt
      }), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60, // 1 hour
        path: '/'
      });
      
      console.log('[SetupComplete] Session cookie updated with onboarding completion');
      return response;
      
    } catch (sessionError) {
      console.error('[SetupComplete] Error updating session cookie:', sessionError);
      
      // Return success even if session update fails, as long as backend was updated
      return NextResponse.json({
        success: backendUpdateSuccessful,
        message: backendUpdateSuccessful 
          ? 'Onboarding completed in backend, session update failed'
          : 'Onboarding completion failed',
        onboarding_completed: backendUpdateSuccessful,
        needs_onboarding: !backendUpdateSuccessful,
        current_step: backendUpdateSuccessful ? 'completed' : 'business_info',
        setup_completed_at: completedAt,
        backend_updated: backendUpdateSuccessful,
        session_error: sessionError.message,
        tenantId: tenantId
      });
    }
    
  } catch (error) {
    console.error('[SetupComplete] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}