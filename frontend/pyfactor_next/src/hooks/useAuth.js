'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sessionManager } from '@/utils/sessionManager';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // First check localStorage/sessionStorage
      const localSession = sessionManager.getSession();
      
      if (localSession && localSession.user) {
        setIsAuthenticated(true);
        setUser(localSession.user);
        setIsLoading(false);
        return;
      }

      // Then check server session
      const response = await fetch('/api/auth/session', {
        headers: {
          'Authorization': localSession?.accessToken ? `Bearer ${localSession.accessToken}` : ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.user) {
          setIsAuthenticated(true);
          setUser(data.user);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('[useAuth] Error checking auth:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    sessionManager.clearSession();
    setIsAuthenticated(false);
    setUser(null);
    router.push('/');
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    signOut,
    checkAuth
  };
}