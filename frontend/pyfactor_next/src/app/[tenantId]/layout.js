import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import TenantInitializer from './TenantInitializer';
import { decrypt } from '@/utils/sessionEncryption';

// This layout is a server component that wraps all tenant-specific pages
export default async function TenantLayout({ children, params }) {
  try {
    // Get the tenant ID from params (properly awaited for Next.js 15+)
    const { tenantId } = await params;
    
    // If we don't have a tenant ID in the URL, redirect to home
    if (!tenantId) {
      redirect('/');
    }
    
    // Check for custom Auth0 session
    let session = null;
    
    try {
      const cookieStore = await cookies();
      
      // Log all available cookies
      const allCookies = cookieStore.getAll();
      console.log('[TenantLayout] Available cookies:', allCookies.map(c => c.name));
      
      // Check for backend session token first
      const sessionTokenCookie = cookieStore.get('session_token');
      console.log('[TenantLayout] Backend session token check:', {
        found: !!sessionTokenCookie,
        value: sessionTokenCookie?.value ? 'present' : 'missing'
      });
      
      if (sessionTokenCookie) {
        console.log('[TenantLayout] Found backend session token, validating...');
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
          console.log('[TenantLayout] Making request to:', `${apiUrl}/api/sessions/current/`);
          const sessionResponse = await fetch(`${apiUrl}/api/sessions/current/`, {
            headers: {
              'Authorization': `Session ${sessionTokenCookie.value}`,
              'Content-Type': 'application/json',
            }
          });
          
          if (sessionResponse.ok) {
            const backendSession = await sessionResponse.json();
            console.log('[TenantLayout] Backend session valid:', {
              user_email: backendSession.user?.email,
              needs_onboarding: backendSession.needs_onboarding,
              tenant_id: backendSession.tenant?.id
            });
            
            // Create session object from backend data
            session = {
              user: {
                ...backendSession.user,
                needsOnboarding: backendSession.needs_onboarding,
                onboardingCompleted: backendSession.onboarding_completed,
                tenantId: backendSession.tenant?.id,
                tenant_id: backendSession.tenant?.id
              },
              authenticated: true
            };
          }
        } catch (error) {
          console.error('[TenantLayout] Backend session validation error:', error);
        }
      }
      
      // If no backend session, check frontend cookies
      if (!session) {
        const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
        
        if (sessionCookie) {
          console.log('[TenantLayout] Found session cookie:', sessionCookie.name);
          // Try to decrypt the session
          try {
            const decrypted = decrypt(sessionCookie.value);
            session = JSON.parse(decrypted);
          } catch (decryptError) {
            // Fallback to old base64 format
            try {
              session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
            } catch (base64Error) {
              console.error('[TenantLayout] Failed to parse session:', base64Error);
            }
          }
        }
      }
    } catch (error) {
      console.error('[TenantLayout] Failed to get session:', error);
      // During build, just continue
      if (process.env.NODE_ENV === 'development' || process.env.NEXT_PHASE === 'phase-production-build') {
        return (
          <>
            <TenantInitializer tenantId={tenantId} />
            {children}
          </>
        );
      }
    }
    
    // For client-side session verification, we'll handle it in a client component
    // This allows us to check for pending sessions from recent logins
    if (!session || !session.user) {
      // Import the client-side session check component
      const SessionCheck = (await import('./SessionCheck.jsx')).default;
      
      return (
        <SessionCheck>
          <TenantInitializer tenantId={tenantId} />
          {children}
        </SessionCheck>
      );
    }
    
    // Check onboarding status from profile data if available
    const needsOnboarding = session.needsOnboarding || session.user?.needsOnboarding || session.user?.needs_onboarding;
    const onboardingCompleted = session.onboardingCompleted || session.user?.onboardingCompleted || session.user?.onboarding_completed;
    const paymentPending = session.user?.paymentPending || session.user?.payment_pending || session.user?.needsPayment || session.user?.needs_payment;
    const currentStep = session.user?.currentStep || session.user?.current_onboarding_step;
    
    // Check for onboarding completion indicators in cookies
    // Get cookies again since cookieStore is out of scope from the try block
    const cookieStore2 = await cookies();
    const onboardingJustCompletedCookie = cookieStore2.get('onboarding_just_completed');
    const onboardingStatusCookie = cookieStore2.get('onboarding_status');
    const paymentCompletedCookie = cookieStore2.get('payment_completed');
    
    let skipOnboardingRedirect = false;
    
    // Check if onboarding was just completed (temporary cookie)
    if (onboardingJustCompletedCookie?.value === 'true') {
      console.log('[TenantLayout] Found onboarding_just_completed cookie, skipping redirect');
      skipOnboardingRedirect = true;
    }
    
    // Check if payment was just completed (temporary cookie)
    if (paymentCompletedCookie?.value === 'true') {
      console.log('[TenantLayout] Found payment_completed cookie, skipping redirect');
      skipOnboardingRedirect = true;
    }
    
    // Check onboarding status cookie
    if (onboardingStatusCookie) {
      try {
        const statusData = JSON.parse(onboardingStatusCookie.value);
        if (statusData.completed === true || (statusData.onboardingCompleted === true && !statusData.needsPayment)) {
          console.log('[TenantLayout] Found completed onboarding status cookie, skipping redirect');
          skipOnboardingRedirect = true;
        }
      } catch (e) {
        console.error('[TenantLayout] Failed to parse onboarding_status cookie:', e);
      }
    }
    
    // Check if user has pending payment for paid tier
    if (paymentPending && currentStep === 'payment' && !skipOnboardingRedirect) {
      console.log('[TenantLayout] User has pending payment, redirecting to payment page');
      redirect('/onboarding/payment');
    }
    
    // Only redirect to onboarding if truly needed and no completion indicators found
    if (needsOnboarding && !onboardingCompleted && !skipOnboardingRedirect) {
      console.log('[TenantLayout] User needs onboarding, redirecting');
      redirect('/onboarding');
    }
    
    // Verify user has access to this tenant
    const userTenantId = session.tenantId || session.user?.tenantId || session.user?.tenant_id;
    if (userTenantId && userTenantId !== tenantId) {
      // User is trying to access a different tenant
      redirect(`/${userTenantId}/dashboard`);
    }
    
    return (
      <>
        <TenantInitializer tenantId={tenantId} />
        {children}
      </>
    );
  } catch (error) {
    // Log the error but don't redirect to home for all errors
    console.error('[TenantLayout] Error:', error);
    
    // Only redirect to home for specific critical errors
    if (error.message?.includes('NEXT_REDIRECT')) {
      // This is an intentional redirect, let it through
      throw error;
    }
    
    // For other errors, try to render the page anyway
    // This prevents users from being kicked out due to transient errors
    const { tenantId } = await params;
    return (
      <>
        <TenantInitializer tenantId={tenantId} />
        {children}
      </>
    );
  }
} 