'use client';

import React, { useEffect, useState, memo, useCallback, useRef, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';
import AppBar from '../components/AppBar';
import Drawer from './components/Drawer';
import RenderMainContent from './components/RenderMainContent';
import SetupProgressOverlay from './components/SetupProgressOverlay';

const DashboardContent = memo(() => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        if (status === 'unauthenticated') {
          router.push('/auth/signin');
          return;
        }

        if (status === 'authenticated') {
          // Check onboarding status
          const onboardingStatus = session.user['custom:onboarding'];
          if (onboardingStatus !== 'complete') {
            router.push(`/onboarding/${onboardingStatus || 'business-info'}`);
            return;
          }

          setIsLoading(false);
        }
      } catch (error) {
        logger.error('Dashboard initialization failed:', error);
        await signOut();
        router.push('/auth/signin');
      }
    };

    initializeDashboard();
  }, [status, session, router, signOut]);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen(!mobileOpen);
  }, [mobileOpen]);

  const handleMenuItemSelect = useCallback((item) => {
    setSelectedItem(item);
    setMobileOpen(false);
  }, []);

  if (isLoading || status === 'loading') {
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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar onMenuClick={handleDrawerToggle} />
      <Drawer
        mobileOpen={mobileOpen}
        onDrawerToggle={handleDrawerToggle}
        onItemSelect={handleMenuItemSelect}
        selectedItem={selectedItem}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - 240px)` },
          mt: 8,
        }}
      >
        <Suspense
          fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          }
        >
          <RenderMainContent selectedItem={selectedItem} />
        </Suspense>
      </Box>
      <SetupProgressOverlay />
    </Box>
  );
});

DashboardContent.displayName = 'DashboardContent';

export default DashboardContent;
