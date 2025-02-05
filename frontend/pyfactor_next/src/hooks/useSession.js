///Users/kuoldeng/projectx/frontend/pyfactor_next/src/hooks/useSession.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from '@aws-amplify/core';
import { logger } from '@/utils/logger';

export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      logger.debug('[useSession] Checking session...');
      
      // ✅ Fetch session and ensure tokens are valid
      const authSession = await fetchAuthSession();
      const idToken = authSession.tokens?.idToken?.toString();

      if (!idToken) {
        logger.warn('[useSession] No valid session token found.');
        setSession(null);
        return false;
      }

      const user = await getCurrentUser();
      if (user) {
        logger.debug('[useSession] Session found:', user);
        setSession({
          user: {
            ...user.attributes,
            id: user.userId,
          },
          tokens: {
            accessToken: authSession.tokens.accessToken?.toString(),
            idToken: idToken,
          },
        });

        // ✅ Store session token in localStorage to sync with middleware
        localStorage.setItem('idToken', idToken);

        return true;
      } else {
        logger.warn('[useSession] No user data found.');
        setSession(null);
        return false;
      }
    } catch (error) {
      logger.warn('[useSession] No active session:', error);
      setSession(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // ✅ Initial session check
    checkSession();

    // ✅ Listen for authentication events
    const unsubscribe = Hub.listen('auth', async (data) => {
      const { event } = data.payload;
      if (['signedIn', 'tokenRefresh'].includes(event)) {
        await checkSession();
      } else if (event === 'signedOut') {
        setSession(null);
      }
    });

    return () => unsubscribe();
  }, [checkSession]);

  return {
    data: session,
    status: loading ? 'loading' : session ? 'authenticated' : 'unauthenticated',
    update: checkSession,
  };
}
