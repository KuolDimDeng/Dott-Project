import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decrypt, encrypt } from '@/utils/sessionEncryption';

/**
 * GET /api/tenant/business-info
 * Fetches business information for the authenticated user's tenant
 */
export async function GET(request) {
  try {
    console.log('[Business Info API] Fetching business information');
    
    // Get Auth0 session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    if (!sessionCookie) {
      console.log('[Business Info API] No session found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    let sessionData;
    try {
      // Try to decrypt first (new format)
      try {
        const decrypted = decrypt(sessionCookie.value);
        sessionData = JSON.parse(decrypted);
      } catch (decryptError) {
        // Fallback to old base64 format for backward compatibility
        console.warn('[Business Info API] Using legacy base64 format');
        sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      }
    } catch (error) {
      console.error('[Business Info API] Error parsing session:', error);
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }
    
    const { user, accessToken } = sessionData;
    
    if (!user) {
      return NextResponse.json({ error: 'No user in session' }, { status: 401 });
    }
    
    // Get tenant ID from session or query params
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || user.tenantId || user.tenant_id;
    
    if (!tenantId) {
      console.log('[Business Info API] No tenant ID found');
      return NextResponse.json({ error: 'No tenant ID found' }, { status: 400 });
    }
    
    console.log('[Business Info API] Fetching business info for tenant:', tenantId);
    
    // Try to fetch from backend
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://127.0.0.1:8000';
    
    try {
      // First try to get onboarding data which includes business info
      const onboardingResponse = await fetch(`${apiBaseUrl}/api/onboarding/data/?tenant_id=${tenantId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      
      if (onboardingResponse.ok) {
        const onboardingData = await onboardingResponse.json();
        console.log('[Business Info API] Found onboarding data:', {
          hasBusinessName: !!onboardingData.business_name,
          hasTenantId: !!onboardingData.tenant_id,
          subscriptionPlan: onboardingData.selected_plan || onboardingData.subscription_plan || onboardingData.subscription_type
        });
        
        let subscriptionPlan = onboardingData.selected_plan || onboardingData.subscription_plan || onboardingData.subscription_type;
        
        // If no subscription plan in onboarding data, try to get from user profile
        if (!subscriptionPlan || subscriptionPlan === 'free') {
          try {
            const profileResponse = await fetch(`${apiBaseUrl}/api/users/me/`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              }
            });
            
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              console.log('[Business Info API] Profile data subscription fields:', {
                subscription_plan: profileData.subscription_plan,
                selected_plan: profileData.selected_plan,
                subscription_type: profileData.subscription_type
              });
              subscriptionPlan = profileData.selected_plan || profileData.subscription_plan || profileData.subscription_type || subscriptionPlan || 'free';
            }
          } catch (profileError) {
            console.error('[Business Info API] Error fetching profile for subscription:', profileError);
          }
        }
        
        const businessInfo = {
          businessName: onboardingData.business_name || onboardingData.legal_name || '',
          businessType: onboardingData.business_type || '',
          legalStructure: onboardingData.legal_structure || '',
          country: onboardingData.country || '',
          state: onboardingData.state || '',
          subscriptionPlan: subscriptionPlan || 'free',
          tenantId: tenantId,
          ownerFirstName: onboardingData.owner_first_name || '',
          ownerLastName: onboardingData.owner_last_name || '',
          phoneNumber: onboardingData.phone_number || '',
          address: onboardingData.address || '',
          onboardingCompleted: onboardingData.onboarding_completed || false,
          source: 'backend_onboarding'
        };
        
        console.log('[Business Info API] Final business info with subscription:', {
          businessName: businessInfo.businessName,
          subscriptionPlan: businessInfo.subscriptionPlan
        });
        
        // Update session with business info
        if (businessInfo.businessName || businessInfo.subscriptionPlan !== 'free') {
          sessionData.user.businessName = businessInfo.businessName;
          sessionData.user.businessType = businessInfo.businessType;
          sessionData.user.subscriptionPlan = businessInfo.subscriptionPlan;
          sessionData.user.subscription_plan = businessInfo.subscriptionPlan;
          sessionData.user.selected_plan = businessInfo.subscriptionPlan;
          sessionData.user.selectedPlan = businessInfo.subscriptionPlan;
          sessionData.user.subscription_type = businessInfo.subscriptionPlan;
          sessionData.user.subscriptionType = businessInfo.subscriptionPlan;
          
          // Encrypt the updated session
          const encryptedSession = encrypt(JSON.stringify(sessionData));
          
          const response = NextResponse.json(businessInfo);
          
          // Cookie options
          const cookieOptions = {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
          };
          
          // Set both cookie names for compatibility
          response.cookies.set('dott_auth_session', encryptedSession, cookieOptions);
          response.cookies.set('appSession', encryptedSession, cookieOptions);
          
          return response;
        }
        
        return NextResponse.json(businessInfo);
      }
    } catch (error) {
      console.error('[Business Info API] Error fetching from backend:', error);
    }
    
    // If backend fetch failed, return session data if available
    if (user.businessName) {
      console.log('[Business Info API] Returning business info from session');
      return NextResponse.json({
        businessName: user.businessName,
        businessType: user.businessType || '',
        subscriptionPlan: user.subscriptionPlan || 'free',
        tenantId: tenantId,
        source: 'session'
      });
    }
    
    console.log('[Business Info API] No business info found');
    return NextResponse.json({
      businessName: '',
      businessType: '',
      subscriptionPlan: 'free',
      tenantId: tenantId,
      source: 'none'
    });
    
  } catch (error) {
    console.error('[Business Info API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}