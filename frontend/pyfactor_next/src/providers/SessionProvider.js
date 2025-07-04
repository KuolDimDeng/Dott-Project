'use client';

import React, { createContext, useContext } from 'react';
import { useSession } from '@/hooks/useSession-v2';

// Create the session context
const SessionContext = createContext(undefined);

// Session provider component that wraps the useSession hook
export function SessionProvider({ children }) {
  const sessionData = useSession();
  
  console.log('🔧 [SessionProvider] Providing session data:', {
    loading: sessionData.loading,
    isAuthenticated: sessionData.isAuthenticated,
    hasUser: !!sessionData.user,
    userEmail: sessionData.user?.email
  });
  
  return (
    <SessionContext.Provider value={sessionData}>
      {children}
    </SessionContext.Provider>
  );
}

// Hook to use the session context
export function useSessionContext() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
}

// Legacy compatibility - export as useAuth for existing components
export const useAuth = useSessionContext;
export const useAuthContext = useSessionContext;

export default SessionProvider;