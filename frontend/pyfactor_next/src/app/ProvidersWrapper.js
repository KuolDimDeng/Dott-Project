'use client';

import React from 'react';
import { UserProvider } from '@/contexts/UserContext';
import LanguageProvider from '@/components/LanguageProvider/LanguageProvider';
import { UserProfileProvider } from '@/contexts/UserProfileContext';

/**
 * Extremely simple providers wrapper - Auth0 compatible
 */
export default function ProvidersWrapper({ children }) {
  return (
    <>
      <UserProvider>
        <UserProfileProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </UserProfileProvider>
      </UserProvider>
    </>
  );
} 