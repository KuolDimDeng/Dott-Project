'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@/styles/theme';
import AuthWrapper from './AuthWrapper/page';
import { OnboardingProvider } from './onboarding/contexts/page';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <OnboardingProvider>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <AuthWrapper>{children}</AuthWrapper>
            </ThemeProvider>
          </OnboardingProvider>
        </SessionProvider>
      </body>
    </html>
  );
}