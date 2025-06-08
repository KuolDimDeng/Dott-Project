'use client';


import { SessionProvider } from 'next-auth/react';

/**
 * Simple provider wrapper that includes session provider
 * to get the landing page to render
 */
export function SimpleProviderWrapper({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
} 