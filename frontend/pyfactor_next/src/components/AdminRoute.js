'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

const AdminRoute = (WrappedComponent) => {
  return function AdminRouteWrapper(props) {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
      // Check if user is authenticated and is an admin
      if (status === 'authenticated') {
        if (!session?.user?.isAdmin) {
          router.replace('/dashboard');
        }
      } else if (status === 'unauthenticated') {
        router.replace('/auth/signin');
      }
    }, [session, status, router]);

    // Show nothing while checking authentication
    if (status === 'loading' || !session?.user?.isAdmin) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
};

export default AdminRoute;
