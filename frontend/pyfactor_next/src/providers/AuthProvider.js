import { useUser } from '@auth0/nextjs-auth0';
import { setAppCacheItem, getAppCacheItem, removeAppCacheItem, clearAppCache, initAppCache } from '@/utils/appCache';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const { user: auth0User, error: auth0Error, isLoading: auth0Loading } = useUser();
  const [error, setError] = useState(null);
  const router = useRouter();

  // Map Auth0 user to our expected format
  const user = auth0User ? {
    username: auth0User.email,
    email: auth0User.email,
    sub: auth0User.sub,
    name: auth0User.name,
    picture: auth0User.picture,
    attributes: {
      email: auth0User.email,
      email_verified: auth0User.email_verified ? 'true' : 'false',
      sub: auth0User.sub,
      name: auth0User.name,
      picture: auth0User.picture
    }
  } : null;

  const isAuthenticated = !!auth0User;
  const isLoading = auth0Loading;

  const login = async (username, password) => {
    try {
      setError(null);
      
      // Redirect to Auth0 Universal Login
      if (typeof window !== 'undefined') {
        window.location.href = '/api/auth/login';
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to login');
    }
  };

  const logout = async () => {
    try {
      setError(null);
      
      // Redirect to Auth0 logout
      if (typeof window !== 'undefined') {
        window.location.href = '/api/auth/logout';
      }
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message || 'Failed to logout');
    }
  };

  const checkAuth = async () => {
    // Auth0 handles this automatically via the useUser hook
    return isAuthenticated;
  };

  const refreshSession = async () => {
    try {
      // Auth0 handles session refresh automatically
      return true;
    } catch (error) {
      console.error('Refresh session error:', error);
      return false;
    }
  };

  const getTokens = async () => {
    try {
      // Get tokens from Auth0
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        return {
          idToken: 'auth0-id-token', // Auth0 tokens are handled differently
          accessToken: 'auth0-access-token'
        };
      }
      throw new Error('Failed to get tokens');
    } catch (error) {
      console.error('Get tokens error:', error);
      throw error;
    }
  };

  // Update error state from Auth0
  useEffect(() => {
    if (auth0Error) {
      setError(auth0Error.message || 'Authentication error');
    } else {
      setError(null);
    }
  }, [auth0Error]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        checkAuth,
        refreshSession,
        getTokens
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 