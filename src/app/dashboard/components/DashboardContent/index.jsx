'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { styled, createTheme, ThemeProvider } from '@mui/material/styles';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { CssBaseline, Box, Container, AppBar as MuiAppBar, Toolbar, Typography } from '@mui/material';
import Drawer from '../../components/Drawer';
import AppBar from '../../components/AppBar.optimized';
import renderMainContent from '../../components/RenderMainContent';
import { UserMessageProvider, useUserMessageContext } from '@/contexts/userMessageContext';
import { logger } from '@/utils/logger';
import ConsoleMessages from '../../components/components/ConsoleMessages';
import axiosInstance from '@/lib/axiosConfig';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/auth';

const theme = createTheme({
  palette: {
    primary: { main: '#b3e5fc' }, // Navy blue color
    secondary: { main: '#81d4fa' } // Light blue color
  },
});

function DashboardContent() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { addMessage } = useUserMessageContext();
  const [userData, setUserData] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [uiState, setUiState] = useState({
    showKPIDashboard: true,
    showMainDashboard: false,
    showHome: false
  });

  // Reset all UI state
  const resetAllStates = () => {
    setUiState({
      showKPIDashboard: false,
      showMainDashboard: false,
      showHome: false
    });
  };

  // Handle drawer toggle
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Handle main dashboard click
  const handleMainDashboardClick = () => {
    resetAllStates();
    setUiState(prev => ({ ...prev, showMainDashboard: true }));
  };

  // Handle KPI dashboard click
  const handleKPIDashboardClick = () => {
    resetAllStates();
    setUiState(prev => ({ ...prev, showKPIDashboard: true }));
  };

  // Handle home click
  const handleHomeClick = () => {
    resetAllStates();
    setUiState(prev => ({ ...prev, showHome: true }));
  };

  // Handle logout
  const handleLogout = () => {
    if (logout) {
      logout();
    }
    router.push('/');
  };

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      // Get token from AppCache instead of localStorage
      const appCache = window.__APP_CACHE || {};
      const auth = appCache.auth || {};
      const token = auth.accessToken || '';
      
      const response = await axiosInstance.get('/api/profile/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (response.status === 200) {
        const data = response.data;
        logger.log('Dashboard User data:', data);
        data.first_name = data.first_name || data.email.split('@')[0];
        data.full_name = data.full_name || `${data.first_name} ${data.last_name}`;
        const activeSubscription = data.active_subscription;
        const subscriptionType = activeSubscription ? activeSubscription.subscription_type : 'free';
  
        setUserData({
          ...data,
          subscription_type: subscriptionType       
        });
      } else {
        logger.error('Error fetching user data:', response.statusText);
        addMessage('error', `Error fetching user data: ${response.statusText}`);
        // Clear token from AppCache instead of localStorage
        if (window.__APP_CACHE && window.__APP_CACHE.auth) {
          delete window.__APP_CACHE.auth.accessToken;
        }
        router.push('/auth/signin');
      }
    } catch (error) {
      logger.error('Error fetching user data:', error);
      addMessage('error', `Error fetching user data: ${error.message}`);
      // Clear token from AppCache instead of localStorage
      if (window.__APP_CACHE && window.__APP_CACHE.auth) {
        delete window.__APP_CACHE.auth.accessToken;
      }
      router.push('/auth/signin');
    }
  }, [addMessage, router]);

  // Initialize on component mount
  useEffect(() => {
    fetchUserData();
    resetAllStates();
    setUiState(prev => ({ ...prev, showKPIDashboard: true }));
  }, [fetchUserData]);

  const drawerWidth = 225;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar 
        mainBackground="#fafafa"
        textAppColor="#263238"
        drawerOpen={drawerOpen}
        handleDrawerToggle={handleDrawerToggle}
        userData={userData}
        handleLogout={handleLogout}
      />
      <Drawer 
        drawerOpen={drawerOpen}
        handleDrawerToggle={handleDrawerToggle}
        handleMainDashboardClick={handleMainDashboardClick}
        handleKPIDashboardClick={handleKPIDashboardClick}
        handleHomeClick={handleHomeClick}
      />

      <Container
        sx={{
          marginLeft: drawerOpen ? `${drawerWidth}px` : '0px',
          width: drawerOpen ? `calc(100% - ${drawerWidth}px)` : '100%',
          transition: 'margin-left 0.3s ease, width 0.3s ease',
          padding: 2,
          paddingTop: '66px',
          height: '100vh',
          overflow: 'auto',
        }}
      >
        {renderMainContent({
          showKPIDashboard: uiState.showKPIDashboard,
          showMainDashboard: uiState.showMainDashboard,
          showHome: uiState.showHome
        })}
        <ConsoleMessages />
      </Container>
    </ThemeProvider>
  );
}

export default function Dashboard() {
  return (
    <UserMessageProvider>
      <DashboardContent />
    </UserMessageProvider>
  );
} 