'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/auth';
import { logger } from '@/utils/logger';

export default function SignOut() {
  const { signOut } = useAuth();

  useEffect(() => {
    const performSignOut = async () => {
      try {
        await signOut();
        logger.debug('Sign out successful');
      } catch (error) {
        logger.error('Sign out failed:', error);
        // Even if sign out fails, we'll still redirect to sign in page
        // as the error will be shown via toast notification
      }
    };

    performSignOut();
  }, [signOut]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      <p className="text-gray-600">
        Signing out...
      </p>
    </div>
  );
}
