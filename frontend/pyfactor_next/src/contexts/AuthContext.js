'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { isPublicRoute } from '@/lib/authUtils';
import { appendLanguageParam } from '@/utils/languageUtils';
import { employeeApi } from '@/utils/apiClient';
import { useSession } from '@/hooks/useSession-v2';
import { createSafeContext, useSafeContext } from '@/utils/ContextFix';

// Extend the initial state to include employee
const initialState = {
  isLoading: true,
  hasSession: false,
  hasError: false,
  user: null,
  session: null,
  employee: null,
};

// Create context with default values
const AuthContext = createSafeContext(initialState);

export function AuthProvider({ children }) {
  const [employee, setEmployee] = useState(null);
  const router = useRouter();
  
  // Use the Auth0-based session hook
  const sessionHook = useSession();
  const { 
    isAuthenticated, 
    user, 
    loading, 
    error, 
    session: rawSession,
    logout,
    needsOnboarding,
    onboardingCompleted
  } = sessionHook;
  
  // Create state compatible with existing components
  const state = useMemo(() => ({
    isLoading: loading,
    hasSession: isAuthenticated,
    hasError: !!error,
    user: user ? {
      username: user.email?.split('@')[0] || user.name,
      userId: user.id,
      attributes: {
        email: user.email,
        'custom:onboarding': onboardingCompleted ? 'completed' : (needsOnboarding ? 'not_started' : 'in_progress'),
        'custom:userrole': user.role || 'user',
      }
    } : null,
    session: rawSession ? { tokens: { idToken: { jwtToken: 'dummy-token' } } } : null,
    employee: employee,
  }), [loading, isAuthenticated, error, user, rawSession, employee, onboardingCompleted, needsOnboarding]);

  // Handle onboarding redirection
  useEffect(() => {
    if (!loading && isAuthenticated && user && needsOnboarding) {
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/onboarding/business-info')) {
        logger.debug('[Auth] Redirecting to onboarding');
        router.push(appendLanguageParam('/onboarding/business-info'));
      }
    }
  }, [loading, isAuthenticated, user, needsOnboarding, router]);

  // Fetch employee data when user is authenticated
  const fetchEmployeeData = useCallback(async () => {
    if (!isAuthenticated || !user || employee) return null;
    
    try {
      logger.debug('[Auth] Fetching employee data');
      const employeeData = await employeeApi.getCurrent();
      setEmployee(employeeData);
      logger.debug('[Auth] Employee data loaded');
      return employeeData;
    } catch (error) {
      // Don't set error state if no employee record - this is normal for admin users
      if (error.response && error.response.status !== 404) {
        logger.error('[Auth] Error loading employee data:', error);
      }
      return null;
    }
  }, [isAuthenticated, user, employee]);
  
  useEffect(() => {
    if (isAuthenticated && user && !employee) {
      fetchEmployeeData();
    }
  }, [isAuthenticated, user, employee, fetchEmployeeData]);

  // Add logout function to context value
  const contextValue = useMemo(() => ({
    ...state,
    logout
  }), [state, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Simplified context hook
export function useAuthContext() {
  const context = useSafeContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// Add useAuth as an alias for useAuthContext for compatibility
export const useAuth = useAuthContext;

export default AuthContext;
