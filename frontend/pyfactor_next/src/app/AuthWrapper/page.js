'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthWrapper({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log("AuthWrapper - session:", session);
    console.log("AuthWrapper - status:", status);

    if (status === 'authenticated') {
      if (!session.user.isOnboarded) {
        console.log("User not onboarded, redirecting to onboarding");
        router.push('/onboarding/step1');
      } else {
        console.log("User is onboarded, redirecting to dashboard");
        router.push('/dashboard');
      }
    } else if (status === 'unauthenticated') {
      console.log("User not authenticated, redirecting to landing page");
      router.push('/');
    }
  }, [session, status, router]);

  return children;
}