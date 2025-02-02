// components/withAuth.js
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const withAuth = (WrappedComponent) => {
  return (props) => {
    const router = useRouter();
    const { data: session, status } = useSession();

    useEffect(() => {
      if (status === 'unauthenticated') {
        router.push('/auth/signin');
      }
    }, [status, router]);

    if (status === 'loading') {
      return <div>Loading...</div>;
    }

    if (!session) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
};

export default withAuth;
