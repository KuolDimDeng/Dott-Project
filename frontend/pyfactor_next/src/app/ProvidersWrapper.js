'use client';

import React from 'react';
import { CookiesProvider } from 'react-cookie';
import { Auth0Provider } from '@auth0/nextjs-auth0';
import { Toaster } from 'react-hot-toast';
import { UserProvider } from '@/contexts/UserContext';
import LanguageProvider from '@/components/LanguageProvider/LanguageProvider';
import { UserProfileProvider } from '@/contexts/UserProfileContext';

/**
 * Providers wrapper with CookiesProvider and Auth0Provider
 */
export default function ProvidersWrapper({ children }) {
  return (
    <CookiesProvider>
      <Auth0Provider>
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
      </Auth0Provider>
    </CookiesProvider>
  );
} 