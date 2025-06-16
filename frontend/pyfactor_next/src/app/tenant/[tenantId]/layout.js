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
      const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
      
      if (sessionCookie) {
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
    
    if (!session || !session.user) {
      // No session, redirect to login with tenant dashboard as return URL
      redirect(`/api/auth/login?returnTo=/tenant/${tenantId}/dashboard`);
    }
    
    // Check onboarding status from profile data if available
    const needsOnboarding = session.needsOnboarding || session.user?.needsOnboarding || session.user?.needs_onboarding;
    const onboardingCompleted = session.onboardingCompleted || session.user?.onboardingCompleted || session.user?.onboarding_completed;
    const paymentPending = session.user?.paymentPending || session.user?.payment_pending || session.user?.needsPayment || session.user?.needs_payment;
    const currentStep = session.user?.currentStep || session.user?.current_onboarding_step;
    
    // Check for onboarding completion indicators in cookies
    const onboardingJustCompletedCookie = cookieStore.get('onboarding_just_completed');
    const onboardingStatusCookie = cookieStore.get('onboarding_status');
    const paymentCompletedCookie = cookieStore.get('payment_completed');
    
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
      redirect(`/tenant/${userTenantId}/dashboard`);
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