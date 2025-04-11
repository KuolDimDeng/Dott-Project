'use client';

import React from 'react';
import { UserProvider } from '@/contexts/UserContext';
import LanguageProvider from '@/components/LanguageProvider/LanguageProvider';
import ConfigureAmplify from '@/components/ConfigureAmplify';

/**
 * Extremely simple providers wrapper
 */
export default function ProvidersWrapper({ children }) {
  return (
    <>
      <ConfigureAmplify />
      <UserProvider>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </UserProvider>
    </>
  );
} 