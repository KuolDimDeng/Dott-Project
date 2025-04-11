'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { TenantProvider } from '@/context/TenantContext';
import { SessionProvider } from 'next-auth/react';
import { CookiesProvider } from 'react-cookie';
import dynamic from 'next/dynamic';

// Import auth initializer to ensure Amplify is configured correctly
import '@/lib/authInitializer';

// Lazy load the tenant middleware to avoid client/server issues
const TenantMiddleware = dynamic(() => import('@/middleware/tenant-middleware-component'), {
  ssr: false
});

/**
 * Providers component that wraps the application with necessary context providers
 */
export default function Providers({ children }) {
  return (
    <CookiesProvider>
      <SessionProvider>
        <AuthProvider>
          <TenantProvider>
            <TenantMiddleware />
            {children}
          </TenantProvider>
        </AuthProvider>
      </SessionProvider>
    </CookiesProvider>
  );
} 