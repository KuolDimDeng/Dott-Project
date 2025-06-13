import { redirect } from 'next/navigation';
import { getSession } from '@auth0/nextjs-auth0';
import TenantInitializer from './TenantInitializer';

// This layout is a server component that wraps all tenant-specific pages
export default async function TenantLayout({ children, params }) {
  try {
    // Check Auth0 session first
    const session = await getSession();
    
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
    
    // Get the tenant ID from params (properly awaited for Next.js 15+)
    const { tenantId } = await params;
    
    // If we don't have a tenant ID in the URL, redirect to home
    if (!tenantId) {
      redirect('/');
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