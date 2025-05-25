'use client';

import React, { useEffect, useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { TenantProvider } from '@/context/TenantContext';
import { SessionProvider } from 'next-auth/react';
import { CookiesProvider } from 'react-cookie';
import dynamic from 'next/dynamic';
import { UserProfileProvider } from '@/contexts/UserProfileContext';

// Import auth initializer to ensure Amplify is configured correctly
import '@/lib/authInitializer';

// Simple fallback component in case the dynamic import fails
const FallbackTenantMiddleware = () => {
  useEffect(() => {
    console.log('[TenantMiddleware] Using fallback tenant middleware');
    
    // Try to get tenant ID from localStorage as a basic initialization
    try {
      const tenantId = localStorage.getItem('tenantId');
      if (tenantId) {
        console.info(`[TenantMiddleware] Found tenant ID in storage: ${tenantId}`);
      }
    } catch (e) {
      console.warn('[TenantMiddleware] Error checking localStorage:', e);
    }
  }, []);
  
  return null;
};

// Lazy load the tenant middleware to avoid client/server issues
const TenantMiddleware = dynamic(() => import('@/components/TenantMiddlewareComponent'), {
  ssr: false,
  loading: () => null,
  // Use the fallback component if the import fails
  onError: (err) => {
    console.error('[TenantMiddleware] Error loading middleware component:', err);
    return <FallbackTenantMiddleware />;
  }
});

/**
 * Providers component that wraps the application with necessary context providers
 */
export default function Providers({ children }) {
  // Add error handling for the whole provider tree
  const [error, setError] = useState(null);
  
  // Add error boundary using useEffect
  useEffect(() => {
    const handleError = (event) => {
      const errorMessage = event.error?.message || '';
      const errorName = event.error?.name || '';
      
      // Log all errors for debugging
      console.error('[Providers] Caught unhandled error:', event.error);
      
      // Only set error state for critical errors that should break the app
      // Don't break the app for Hub-related warnings or non-critical errors
      const isCriticalError = 
        !errorMessage.includes('Hub') && 
        !errorMessage.includes('not available') &&
        !errorMessage.includes('fallback') &&
        !errorName.includes('Warning') &&
        errorMessage !== 'ResizeObserver loop limit exceeded';
      
      if (isCriticalError) {
        console.error('[Providers] Critical error detected, setting error state:', event.error);
        setError(event.error);
      } else {
        console.warn('[Providers] Non-critical error ignored:', errorMessage);
      }
      
      // Prevent the error from propagating further
      event.preventDefault();
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  // If there's a severe error, render a simple error message
  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Something went wrong</h2>
        <p>Please refresh the page to try again.</p>
        <button 
          onClick={() => window.location.reload()} 
          style={{ padding: '8px 16px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Refresh
        </button>
      </div>
    );
  }
  
  return (
    <CookiesProvider>
      <SessionProvider>
        <AuthProvider>
          <TenantProvider>
            <UserProfileProvider>
              <TenantMiddleware />
              {children}
            </UserProfileProvider>
          </TenantProvider>
        </AuthProvider>
      </SessionProvider>
    </CookiesProvider>
  );
} 