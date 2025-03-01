'use client';

import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useSession } from '@/hooks/useSession';
import DashboardContent from './DashboardContent';
import DashboardSetupStatus from '@/components/DashboardSetupStatus';

export default function DashboardPage() {
  const { user, loading } = useSession();

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

  const isSetup = user?.attributes?.['custom:onboarding'] === 'SETUP';

  return (
    <>
      {isSetup ? (
        <Box sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Welcome to Your Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Setting up your account... This may take a few minutes.
          </Typography>
          <DashboardSetupStatus />
        </Box>
      ) : (
        <DashboardContent />
      )}
    </>
  );
}