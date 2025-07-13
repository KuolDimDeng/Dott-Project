'use client';

import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);

  const checkAuth = useCallback(async () => {
    try {
      console.log('[useAdminAuth] Checking authentication...');
      
      // Check if we have admin user data in localStorage
      const userData = localStorage.getItem('admin_user');
      console.log('[useAdminAuth] Local storage user data:', userData ? 'exists' : 'missing');
      
      if (!userData) {
        setIsLoading(false);
        return;
      }

      // Verify token is still valid by making a request to protected endpoint
      // The token is stored in httpOnly cookies, so we just need to include credentials
      console.log('[useAdminAuth] Verifying token with dashboard endpoint...');
      const response = await fetch('/api/admin/proxy/admin/dashboard', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('[useAdminAuth] Dashboard response status:', response.status);

      if (response.ok) {
        const parsedUser = JSON.parse(userData);
        console.log('[useAdminAuth] User authenticated:', parsedUser.email);
        setAdminUser(parsedUser);
        setIsAuthenticated(true);
      } else {
        console.log('[useAdminAuth] Token invalid or expired, clearing auth');
        // Token is invalid or expired, clear storage
        localStorage.removeItem('admin_user');
        setIsAuthenticated(false);
        setAdminUser(null);
      }
    } catch (error) {
      console.error('[useAdminAuth] Auth check failed:', error);
      // Clear invalid auth data
      localStorage.removeItem('admin_user');
      setIsAuthenticated(false);
      setAdminUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (loginData) => {
    try {
      setIsLoading(true);
      
      // If loginData is already the response from a successful login
      // (called from EnhancedAdminLogin component after successful login)
      if (loginData && loginData.user && loginData.access_token) {
        setAdminUser(loginData.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      
      // Otherwise, if it's a username/password object, perform login
      // (this case shouldn't happen with current implementation)
      if (loginData && loginData.username && loginData.password) {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(loginData),
        });

      const data = await response.json();

      if (response.ok) {
        // Store only user data in localStorage (tokens are in httpOnly cookies)
        localStorage.setItem('admin_user', JSON.stringify(data.user));
        
        setAdminUser(data.user);
        setIsAuthenticated(true);
        
        toast.success(`Welcome back, ${data.user.full_name}!`);
        return { success: true };
      } else {
        let errorMessage = 'Login failed';
        
        if (response.status === 423) {
          errorMessage = `Account locked until ${new Date(data.locked_until).toLocaleString()}`;
        } else if (response.status === 403) {
          errorMessage = 'Access denied from this IP address';
        } else if (data.error) {
          errorMessage = data.error;
        }
        
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
      }
      
      // If neither case matches, return error
      throw new Error('Invalid login data');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Network error. Please try again.');
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Call logout endpoint to clear cookies
      await fetch('/api/admin/auth/clear-tokens', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear local storage
    localStorage.removeItem('admin_user');
    
    setIsAuthenticated(false);
    setAdminUser(null);
    
    toast.success('Logged out successfully');
  }, []);

  const getAuthHeaders = useCallback(() => {
    // No need to return auth headers as they're in httpOnly cookies
    // Just return empty object - cookies will be sent automatically with credentials: 'include'
    return {};
  }, []);

  return {
    isAuthenticated,
    isLoading,
    adminUser,
    login,
    logout,
    checkAuth,
    getAuthHeaders,
  };
}