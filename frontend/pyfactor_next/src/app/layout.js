'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@/styles/theme';
import AuthWrapper from './AuthWrapper/page';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthWrapper>{children}</AuthWrapper>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}