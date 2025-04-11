'use client';

import { useSession } from './useSession';
import { logger } from '@/utils/logger';

/**
 * Custom hook to access user data from the session
 * @returns {Object} An object containing the user data and loading state
 */
export const useUser = () => {
  const { user, isLoading, hasSession, hasError } = useSession();
  
  return {
    user,
    isLoading,
    isAuthenticated: hasSession && !hasError && !!user,
    hasError
  };
}; 