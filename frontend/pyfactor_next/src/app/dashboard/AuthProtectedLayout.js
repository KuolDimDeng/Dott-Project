import { getSession } from '@auth0/nextjs-auth0';
import { redirect } from 'next/navigation';

export default async function AuthProtectedLayout({ children }) {
  // This runs on the server
  const session = await getSession();
  
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