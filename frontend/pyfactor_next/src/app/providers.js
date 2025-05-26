'use client';

import React, { useEffect, useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { TenantProvider } from '@/context/TenantContext';
import { SessionProvider } from 'next-auth/react';
import { CookiesProvider } from 'react-cookie';
import { UserProfileProvider } from '@/contexts/UserProfileContext';

// Import auth initializer to ensure Amplify is configured correctly
import '@/lib/authInitializer';

/**
 * Simplified Providers component that wraps the application with necessary context providers
 */
export default function Providers({ children }) {
  // Add error handling for the whole provider tree
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  
  // Only render on client-side to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);
  
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
        errorMessage !== 'ResizeObserver loop limit exceeded' &&
        !errorMessage.includes('I(...) is undefined'); // Ignore this specific error for now
      
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
    window.addEventListener('unhandledrejection', (event) => {
      handleError({ error: event.reason });
    });
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
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
  
  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return null;
  }
  
  return (
    <CookiesProvider>
      <SessionProvider>
        <AuthProvider>
          <TenantProvider>
            <UserProfileProvider>
              {children}
            </UserProfileProvider>
          </TenantProvider>
        </AuthProvider>
      </SessionProvider>
    </CookiesProvider>
  );
} 