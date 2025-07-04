'use client';


import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSessionContext } from '@/providers/SessionProvider';

export default function withAuth(Component) {
  return function WithAuth(props) {
    const router = useRouter();
    const { isAuthenticated, loading: isLoading } = useSessionContext();
    const [isClient, setIsClient] = useState(false);
    
    useEffect(() => {
      setIsClient(true);
      
      if (!isLoading && !isAuthenticated) {
        router.push('/auth/signin');
      }
    }, [isAuthenticated, isLoading, router]);
    
    if (!isClient || isLoading) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-main"></div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      return null;
    }
    
    return <Component {...props} />;
  };
}
