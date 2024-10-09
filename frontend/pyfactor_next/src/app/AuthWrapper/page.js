import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const AuthWrapper = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') {
      console.log('Loading session...');
    } else if (status === 'unauthenticated') {
      console.log('User not authenticated, redirecting to landing page');
      router.push('/');
    } else if (status === 'authenticated') {
      console.log('User authenticated:', session);
      if (!session.user.isOnboarded) {
        router.push('/onboarding/step1');
      }
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return children;
};

export default AuthWrapper;