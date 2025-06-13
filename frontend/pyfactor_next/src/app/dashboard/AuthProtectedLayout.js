import { redirect } from 'next/navigation';

export default async function AuthProtectedLayout({ children }) {
  // Try to get session with error handling
  let session = null;
  
  try {
    // Dynamic import to avoid build-time issues
    const { getSession } = await import('@auth0/nextjs-auth0');
    session = await getSession();
  } catch (error) {
    console.error('[AuthProtectedLayout] Failed to get session:', error);
    // During build or if Auth0 is not configured, just return children
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PHASE === 'phase-production-build') {
      return <>{children}</>;
    }
  }
  
  if (!session) {
    // No session, redirect to login
    redirect('/api/auth/login?returnTo=/dashboard');
  }
  
  // Check onboarding status from session
  const onboardingCompleted = session.user?.onboarding_completed;
  
  if (onboardingCompleted === false) {
    // User needs to complete onboarding
    redirect('/onboarding');
  }
  
  // Session exists and onboarding is completed
  return <>{children}</>;
}