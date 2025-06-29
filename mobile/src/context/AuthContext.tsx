import React, { createContext, useState, useContext, useEffect } from 'react';
import { tokenStorage, userStorage } from '../../../shared/utils/storage';
import { apiClient, authApi } from '../../../shared/api/client';

interface User {
  id: string;
  email: string;
  name: string;
  businessName?: string;
  tenantId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await tokenStorage.getToken();
      if (token) {
        apiClient.setToken(token);
        const sessionData = await authApi.getSession();
        
        if (sessionData.authenticated && sessionData.user) {
          setUser({
            id: sessionData.user.id,
            email: sessionData.user.email,
            name: sessionData.user.name || sessionData.user.email,
            businessName: sessionData.user.businessName,
            tenantId: sessionData.user.tenantId,
          });
          await userStorage.setUser(sessionData.user);
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      await tokenStorage.removeToken();
      await userStorage.removeUser();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      
      if (response.token) {
        await tokenStorage.setToken(response.token);
        apiClient.setToken(response.token);
      }
      
      if (response.user) {
        setUser({
          id: response.user.id,
          email: response.user.email,
          name: response.user.name || response.user.email,
          businessName: response.user.businessName,
          tenantId: response.user.tenantId,
        });
        await userStorage.setUser(response.user);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await tokenStorage.removeToken();
      await userStorage.removeUser();
      apiClient.setToken(null);
      setUser(null);
    }
  };

  const refreshSession = async () => {
    try {
      const sessionData = await authApi.refreshSession();
      if (sessionData.authenticated && sessionData.user) {
        setUser({
          id: sessionData.user.id,
          email: sessionData.user.email,
          name: sessionData.user.name || sessionData.user.email,
          businessName: sessionData.user.businessName,
          tenantId: sessionData.user.tenantId,
        });
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};