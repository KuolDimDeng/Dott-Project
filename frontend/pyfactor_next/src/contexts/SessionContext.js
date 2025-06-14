/**
 * SessionContext
 * Provides global session state management
 */

'use client';

import React, { createContext, useContext } from 'react';
import { useSession } from '@/hooks/useSession';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const session = useSession();
  
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  
  return context;
}

// Export convenience hooks
export const useAuth = () => {
  const { isAuthenticated, user, loading } = useSessionContext();
  return { isAuthenticated: isAuthenticated(), user, loading };
};

export const useTenant = () => {
  const { tenant, tenantId } = useSessionContext();
  return { tenant, tenantId };
};

export const useSubscription = () => {
  const { subscriptionPlan } = useSessionContext();
  return { plan: subscriptionPlan };
};