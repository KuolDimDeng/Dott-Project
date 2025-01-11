// src/app/onboarding/components/layout/OnboardingLayout.js
'use client';

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Container, Box } from '@mui/material';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { LoadingStateWithProgress } from '@/components/LoadingState';

const OnboardingLayout = memo(function OnboardingLayout({ children }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Check for transition state
  if (
    pathname === '/onboarding/subscription' && 
    session?.user?.onboardingStatus === 'business-info'
  ) {
    return <LoadingStateWithProgress message="Preparing subscription options..." />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Container 
        component="main" 
        maxWidth="md" 
        sx={{ 
          flex: 1,
          py: 4,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {children}
      </Container>
    </Box>
  );
});

OnboardingLayout.propTypes = {
  children: PropTypes.node.isRequired
};

export default OnboardingLayout;