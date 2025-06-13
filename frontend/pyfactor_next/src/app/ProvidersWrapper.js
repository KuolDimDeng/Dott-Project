'use client';


import React, { useState, useEffect } from 'react';
import { CookiesProvider } from 'react-cookie';
import { UserProvider as Auth0UserProvider } from '@auth0/nextjs-auth0/client';
import { Toaster } from 'react-hot-toast';
import { UserProvider } from '@/contexts/UserContext';
import LanguageProvider from '@/components/LanguageProvider/LanguageProvider';
import { UserProfileProvider } from '@/contexts/UserProfileContext';

/**
 * Providers wrapper with CookiesProvider and Auth0Provider
 */
export default function ProvidersWrapper({ children }) {
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after client-side mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // During SSR and before hydration, render a minimal version
  if (!isMounted) {
    return (
      <div suppressHydrationWarning>
        {children}
      </div>
    );
  }

  return (
    <CookiesProvider>
      <Auth0UserProvider>
        <UserProvider>
          <UserProfileProvider>
            <LanguageProvider>
              {children}
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                }}
              />
            </LanguageProvider>
          </UserProfileProvider>
        </UserProvider>
      </Auth0UserProvider>
    </CookiesProvider>
  );
} 