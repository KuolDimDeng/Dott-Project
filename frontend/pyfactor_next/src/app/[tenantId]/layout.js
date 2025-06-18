import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import TenantInitializer from './TenantInitializer';
import TenantLayoutWrapper from './TenantLayoutWrapper';

// This layout is a server component that wraps all tenant-specific pages
export default async function TenantLayout({ children, params, searchParams }) {
  try {
    // Get the tenant ID from params (properly awaited for Next.js 15+)
    const { tenantId } = await params;
    
    // If we don't have a tenant ID in the URL, redirect to home
    if (!tenantId) {
      redirect('/');
    }
    
    // Check for session using new approach
    let session = null;
    
    try {
      const cookieStore = await cookies();
      const sessionId = cookieStore.get('sid');
      
      console.log('[TenantLayout] Session check:', {
        sessionId: sessionId ? 'present' : 'missing',
        tenantId
      });
      
      if (sessionId) {
        console.log('[TenantLayout] Validating session with backend...');
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
          const sessionResponse = await fetch(`${apiUrl}/api/sessions/${sessionId.value}/`, {
            headers: {
              'Authorization': `SessionID ${sessionId.value}`,
              'Content-Type': 'application/json',
            },
            cache: 'no-store'
          });
          
          if (sessionResponse.ok) {
            const backendSession = await sessionResponse.json();
            console.log('[TenantLayout] Backend session valid:', {
              email: backendSession.email,
              needs_onboarding: backendSession.needs_onboarding,
              tenant_id: backendSession.tenant_id
            });
            
            // Create session object from backend data
            session = {
              user: {
                email: backendSession.email,
                needsOnboarding: backendSession.needs_onboarding,
                onboardingCompleted: backendSession.onboarding_completed,
                tenantId: backendSession.tenant_id,
                tenant_id: backendSession.tenant_id,
                permissions: backendSession.permissions || []
              },
              authenticated: true
            };
          }
        } catch (error) {
          console.error('[TenantLayout] Backend session validation error:', error);
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
    
    // Check onboarding status from session data only
    const needsOnboarding = session.user?.needsOnboarding;
    const onboardingCompleted = session.user?.onboardingCompleted;
    
    console.log('[TenantLayout] Session status:', {
      needsOnboarding,
      onboardingCompleted,
      tenantId: session.user?.tenantId
    });
    
    // Redirect to onboarding if needed (session is the only source of truth)
    if (needsOnboarding && !onboardingCompleted) {
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
      <TenantLayoutWrapper tenantId={tenantId} initialSession={session}>
        {children}
      </TenantLayoutWrapper>
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
      <TenantLayoutWrapper tenantId={tenantId} initialSession={null}>
        {children}
      </TenantLayoutWrapper>
    );
  }
} 