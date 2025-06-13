import { redirect } from 'next/navigation';
import TenantInitializer from './TenantInitializer';

// This layout is a server component that wraps all tenant-specific pages
export default async function TenantLayout({ children, params }) {
  try {
    // Get the tenant ID from params (properly awaited for Next.js 15+)
    const { tenantId } = await params;
    
    // If we don't have a tenant ID in the URL, redirect to home
    if (!tenantId) {
      redirect('/');
    }
    
    // Try to check Auth0 session with error handling
    let session = null;
    
    try {
      // Dynamic import to avoid build-time issues
      const { getSession } = await import('@auth0/nextjs-auth0');
      session = await getSession();
    } catch (error) {
      console.error('[TenantLayout] Failed to get session:', error);
      // During build or if Auth0 is not configured, just continue
      if (process.env.NODE_ENV === 'development' || process.env.NEXT_PHASE === 'phase-production-build') {
        return (
          <>
            <TenantInitializer tenantId={tenantId} />
            {children}
          </>
        );
      }
    }
    
    if (!session) {
      // No session, redirect to login
      redirect('/api/auth/login?returnTo=/dashboard');
    }
    
    // Check onboarding status
    const onboardingCompleted = session.user?.onboarding_completed;
    
    if (onboardingCompleted === false) {
      // User needs to complete onboarding
      redirect('/onboarding');
    }
    
    // Verify user has access to this tenant
    const userTenantId = session.user?.tenant_id;
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
    // If any error occurs during rendering, redirect to the dashboard
    console.error('TenantLayout error:', error);
    redirect('/dashboard');
  }
} 