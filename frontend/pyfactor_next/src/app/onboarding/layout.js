'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { OnboardingProvider } from './contexts/onboardingContext';

export default function OnboardingLayout({ children }) {

  return (
      <SessionProvider>
        <OnboardingProvider>
          {children}
        </OnboardingProvider>
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
      </SessionProvider>
  );
}