'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Auth } from 'aws-amplify';
import { useAuth } from '@/hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { getCurrentUser } = useAuth();

  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await getCurrentUser();
        
        if (!user) {
          // Not authenticated, redirect to sign in
          router.replace('/auth/signin');
          return;
        }

        // Check if email is verified
        if (!user.emailVerified) {
          router.replace('/auth/verify-email');
          return;
        }

        // Check if onboarding is complete
        if (!user.onboardingComplete && !window.location.pathname.startsWith('/onboarding')) {
          router.replace('/onboarding');
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Auth check error:', error);
        router.replace('/auth/signin');
      }
    }

    checkAuth();
  }, [getCurrentUser, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Render children once authenticated
  return children;
}
