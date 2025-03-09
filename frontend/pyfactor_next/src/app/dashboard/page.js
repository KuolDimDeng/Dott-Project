'use client';

import React, { useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useSession } from '@/hooks/useSession';
import DashboardContent from './DashboardContent';
import { completeOnboarding } from '@/utils/completeOnboarding';
import { logger } from '@/utils/logger';

export default function DashboardPage() {
  const { user, loading } = useSession();

  // Check if user is in SETUP status and update to COMPLETE
  useEffect(() => {
    const updateOnboardingIfNeeded = async () => {
      if (user?.attributes?.['custom:onboarding'] === 'SETUP') {
        logger.debug('[DashboardPage] User in SETUP status, updating to COMPLETE');
        await completeOnboarding();
      }
    };

    if (user) {
      updateOnboardingIfNeeded();
    }
  }, [user]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Always show dashboard content
  return (
    <>
      <DashboardContent />
    </>
  );
}