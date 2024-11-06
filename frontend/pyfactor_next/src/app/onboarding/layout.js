///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/layout.js
'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function OnboardingLayout({ children }) {

  return (
      <SessionProvider>
          {children}
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
      </SessionProvider>
  );
}