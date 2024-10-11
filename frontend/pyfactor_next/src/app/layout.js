'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ErrorBoundary } from 'react-error-boundary';
import theme from '@/styles/theme';
import AuthWrapper from './AuthWrapper/page';
import { OnboardingProvider } from './onboarding/contexts/onboardingContext';
import { useEffect } from 'react';

function ErrorFallback({ error, resetErrorBoundary }) {
  console.error("ErrorFallback: Application error", error);
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

export default function RootLayout({ children }) {
  console.log("RootLayout: Rendering");



  return (
    <html lang="en">
      <body>
        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => {
          console.log("ErrorBoundary: Resetting error state");
        }}>
          <SessionProvider>
            <OnboardingProvider>
              <ThemeProvider theme={theme}>
                <CssBaseline />
                <AuthWrapper>{children}</AuthWrapper>
              </ThemeProvider>
            </OnboardingProvider>
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
