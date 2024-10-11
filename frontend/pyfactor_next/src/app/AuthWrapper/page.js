'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function AuthWrapper({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAndRedirect = async () => {
      console.log('AuthWrapper: Check and Redirect', { status, pathname });
      console.log('Session:', session);

      if (status === 'loading') {
        console.log('AuthWrapper: Session is loading');
        return;
      }

      setIsChecking(true);

      const publicRoutes = ['/', '/about', '/contact', '/auth/signin', '/auth/signup'];

      try {
        if (status === 'authenticated') {
          console.log('AuthWrapper: User is authenticated');
          const onboardingStatus = session?.user?.onboardingStatus || 'step1';
          console.log('Onboarding Status:', onboardingStatus);

          if (onboardingStatus !== 'complete') {
            if (!pathname.startsWith('/onboarding')) {
              console.log('Redirecting to onboarding');
              router.push(`/onboarding/${onboardingStatus}`);
            }
          } else if (pathname === '/' || pathname.startsWith('/onboarding')) {
            console.log('Redirecting to dashboard');
            router.push('/dashboard');
          } else {
            console.log('User is on an appropriate page');
          }
        } else if (status === 'unauthenticated') {
          console.log('AuthWrapper: User is unauthenticated');
          if (!publicRoutes.includes(pathname)) {
            console.log('Redirecting to signin');
            router.push('/auth/signin');
          }
        }
      } catch (error) {
        console.error('AuthWrapper: Error during redirection', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkAndRedirect();
  }, [session, status, router, pathname]);

  if (status === 'loading' || isChecking) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}