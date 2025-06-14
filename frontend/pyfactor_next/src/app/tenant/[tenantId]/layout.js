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
    const needsOnboarding = session.needsOnboarding || session.user?.needsOnboarding;
    const onboardingCompleted = session.onboardingCompleted || session.user?.onboardingCompleted || session.user?.onboarding_completed;
    
    if (needsOnboarding && !onboardingCompleted) {
      // User needs to complete onboarding
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
    // If any error occurs during rendering, redirect to home
    console.error('TenantLayout error:', error);
    redirect('/');
  }
} 