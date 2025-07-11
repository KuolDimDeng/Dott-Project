'use client';

import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Verify token is still valid by making a request to protected endpoint
      const response = await fetch('/api/admin/proxy/admin/dashboard', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const userData = localStorage.getItem('admin_user');
        if (userData) {
          setAdminUser(JSON.parse(userData));
          setIsAuthenticated(true);
        }
      } else {
        // Token is invalid, clear storage
        localStorage.removeItem('admin_access_token');
        localStorage.removeItem('admin_refresh_token');
        localStorage.removeItem('admin_user');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid auth data
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('admin_user');
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
        // Store auth data
        localStorage.setItem('admin_access_token', data.access_token);
        localStorage.setItem('admin_refresh_token', data.refresh_token);
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

  const logout = useCallback(() => {
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
    
    setIsAuthenticated(false);
    setAdminUser(null);
    
    toast.success('Logged out successfully');
  }, []);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('admin_access_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
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