'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@/styles/theme';

function AuthWrapper({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log("AuthWrapper - session:", session);
    console.log("AuthWrapper - status:", status);

    if (status === 'authenticated') {
      if (!session.user.isOnboarded) {
        console.log("User not onboarded, redirecting to onboarding");
        router.push('/onboarding');
      } else {
        console.log("User is onboarded");
      }
    }
  }, [session, status, router]);

  return children;
}

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