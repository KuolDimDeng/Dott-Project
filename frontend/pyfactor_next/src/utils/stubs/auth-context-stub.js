// Build-time stub for AuthContext
import React from 'react';

const AuthContext = null;

export function AuthProvider({ children }) {
  return React.createElement('div', null, children);
}

export function useAuthContext() {
  return {
    isLoading: true,
    hasSession: false,
    hasError: false,
    user: null,
    session: null,
    employee: null,
  };
}

export const useAuth = useAuthContext;

export default AuthContext; 