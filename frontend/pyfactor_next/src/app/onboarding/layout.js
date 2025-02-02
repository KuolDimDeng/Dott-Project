// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/layout.js
'use client';

import React from 'react';
import { OnboardingProvider } from '@/app/onboarding/contexts/OnboardingContext';
import { Container, Box } from '@mui/material';
import { useSession } from 'next-auth/react';
import { LoadingStateWithProgress } from '@/components/LoadingState';

function OnboardingLayout({ children }) {
  const { data: session, status } = useSession();
  

  if (status === 'loading') {
    return <LoadingStateWithProgress message="Loading..." />;
  }

  return (
    <OnboardingProvider>
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Container component="main" maxWidth="md" sx={{ py: 4 }}>
          {children}
        </Container>
      </Box>
    </OnboardingProvider>
  );
}

export default OnboardingLayout;