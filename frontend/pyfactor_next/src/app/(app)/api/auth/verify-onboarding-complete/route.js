import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decrypt } from '@/utils/sessionEncryption';

/**
 * Verify and fix onboarding completion status
 * This endpoint is called when users reach the dashboard to ensure their onboarding status is correct
 */
export async function GET(request) {
  console.log('[VerifyOnboardingComplete] Checking onboarding status...');
  console.log('[VerifyOnboardingComplete] Request headers:', {
    cookie: request.headers.get('cookie') ? 'Present' : 'None',
    authorization: request.headers.get('authorization') ? 'Present' : 'None'
  });
  
  try {
    // Get session
    const cookieStore = await cookies();
    
    // Log all cookies for debugging
    const allCookies = cookieStore.getAll();
    console.log('[VerifyOnboardingComplete] Available cookies:', allCookies.map(c => c.name));
    
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    if (!sessionCookie) {
      console.log('[VerifyOnboardingComplete] No session cookie found, returning 401');
      return NextResponse.json({
        success: false,
        error: 'No session found',
        debug: {
          availableCookies: allCookies.map(c => c.name)
        }
      }, { status: 401 });
    }
    
    let sessionData;
    try {
      const decrypted = decrypt(sessionCookie.value);
      sessionData = JSON.parse(decrypted);
    } catch (decryptError) {
      // Fallback to old base64 format
      try {
        sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      } catch {
        return NextResponse.json({
          success: false,
          error: 'Invalid session'
        }, { status: 401 });
      }
    }
    
    if (!sessionData.user || !sessionData.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Invalid session data'
      }, { status: 401 });
    }
    
    const user = sessionData.user;
    console.log('[VerifyOnboardingComplete] User:', user.email, 'TenantId:', user.tenantId);
    
    // If user has a tenant ID and is on the dashboard, they must have completed onboarding
    if (user.tenantId || user.tenant_id) {
      const tenantId = user.tenantId || user.tenant_id;
      console.log('[VerifyOnboardingComplete] User has tenant, checking backend status...');
      
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
      
      // First check current status
      try {
        const statusResponse = await fetch(`${apiBaseUrl}/api/onboarding/force-complete/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${sessionData.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log('[VerifyOnboardingComplete] Current backend status:', statusData);
          
          // If backend shows incomplete but user has tenant, fix it
          if (statusData.data && statusData.data.needs_onboarding && tenantId) {
            console.log('[VerifyOnboardingComplete] 🚨 Backend shows incomplete but user has tenant - FIXING...');
            
            // Force complete the onboarding
            const forceCompleteResponse = await fetch(`${apiBaseUrl}/api/onboarding/force-complete/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionData.accessToken}`,
                'X-User-Email': user.email,
                'X-User-Sub': user.sub || user.auth0_sub
              },
              body: JSON.stringify({
                selected_plan: user.subscriptionPlan || user.subscription_plan || 'professional',
                payment_verified: true, // If they have a tenant, payment must be done
                tenant_id: tenantId
              })
            });
            
            if (forceCompleteResponse.ok) {
              const forceResult = await forceCompleteResponse.json();
              console.log('[VerifyOnboardingComplete] ✅ Force complete successful:', forceResult);
              
              // Update session cookie to reflect completion
              sessionData.user.needsOnboarding = false;
              sessionData.user.onboardingCompleted = true;
              sessionData.user.needs_onboarding = false;
              sessionData.user.onboarding_completed = true;
              
              const updatedCookie = encrypt(JSON.stringify(sessionData));
              const cookieOptions = {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 // 7 days
              };
              
              const response = NextResponse.json({
                success: true,
                message: 'Onboarding status verified and fixed',
                data: {
                  needs_onboarding: false,
                  tenant_id: tenantId,
                  fixed: true
                }
              });
              
              response.cookies.set('dott_auth_session', updatedCookie, cookieOptions);
              response.cookies.set('appSession', updatedCookie, cookieOptions);
              
              return response;
            }
          } else {
            // Status is already correct
            return NextResponse.json({
              success: true,
              message: 'Onboarding status is correct',
              data: {
                needs_onboarding: statusData.data?.needs_onboarding || false,
                tenant_id: tenantId,
                fixed: false
              }
            });
          }
        }
      } catch (error) {
        console.error('[VerifyOnboardingComplete] Error checking/fixing status:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'No verification needed',
      data: {
        needs_onboarding: user.needsOnboarding || false,
        tenant_id: user.tenantId || user.tenant_id
      }
    });
    
  } catch (error) {
    console.error('[VerifyOnboardingComplete] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to verify onboarding status'
    }, { status: 500 });
  }
}