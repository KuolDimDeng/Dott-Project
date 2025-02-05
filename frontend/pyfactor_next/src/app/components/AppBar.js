'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/auth';
import {
  AppBar as MuiAppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Button,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import { logger } from '@/utils/logger';
import Image from 'next/image';

const pages = [
  { label: 'About', href: '/about' },
  { label: 'Features', sectionId: 'features' },
  { label: 'Pricing', sectionId: 'pricing' },
  { label: 'FAQ', sectionId: 'faq' },
  { label: 'Contact', sectionId: 'contact' },
];

const logoStyle = {
  width: '100px',
  height: 'auto',
  cursor: 'pointer',
};

function AppBar() {
  const router = useRouter();
  const [anchorElNav, setAnchorElNav] = useState(null);
  const { status, data: session } = useSession();
  const { signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const scrollToSection = (sectionId) => {
    const sectionElement = document.getElementById(sectionId);
    if (sectionElement) {
      const offset = 128;
      const targetScroll = sectionElement.offsetTop - offset;
      window.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });
      handleCloseNavMenu();
    } else {
      router.push(`/?section=${sectionId}`);
      handleCloseNavMenu();
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await signOut();
      router.push('/auth/signin');
      logger.debug('User signed out successfully');
    } catch (error) {
      logger.error('Logout failed:', {
        requestId,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigation = (path) => {
    router.push(path);
    handleCloseNavMenu();
  };

  const getButtonProps = () => {
    if (!session?.user) return null;
  
    const onboardingStatus = session.user['custom:onboarding'];
    
    if (onboardingStatus === 'complete') {
      return {
        text: 'Dashboard',
        route: '/dashboard',
        icon: <DashboardIcon />
      };
    }
  
    // If they started but didn't finish onboarding
    if (onboardingStatus) {
      return {
        text: 'Continue Onboarding',
        route: `/onboarding/${onboardingStatus}`,
        icon: <SettingsIcon />
      };
    }
  
    // For new users or no onboarding status
    return null;
  };
  

  const renderAuthButtons = () => {
    if (status === 'loading' || isLoading) {
      return <CircularProgress size={24} />;
    }
  
    if (status === 'authenticated') {
      const buttonProps = getButtonProps();
      if (buttonProps) {
        return (
          <>
            <Button 
              variant="contained"
              onClick={() => handleNavigation(buttonProps.route)}
              startIcon={buttonProps.icon}
            >
              {buttonProps.text}
            </Button>
            <Button 
              variant="text" 
              onClick={handleLogout}
              disabled={isLoading}
            >
              {isLoading ? 'Signing out...' : 'Sign Out'}
            </Button>
          </>
        );
      }
    }

    return (
      <Button 
        variant="contained" 
        onClick={() => handleNavigation('/auth/signin')}
      >
       Sign In / Sign Up
      </Button>
    );
  };

  return (
    <MuiAppBar position="fixed" sx={{ bgcolor: 'white', boxShadow: 1 }}>
      <Container maxWidth="lg">
        <Toolbar
          disableGutters
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: 80,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Image
              src="/static/images/Pyfactor.png"
              alt="Pyfactor logo"
              width={100}
              height={33}
              style={logoStyle}
              onClick={() => handleNavigation('/')}
              priority
            />
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
            {pages.map((page) =>
              page.href ? (
                <Button
                  key={page.label}
                  onClick={() => handleNavigation(page.href)}
                  sx={{
                    mx: 1,
                    color: 'text.primary',
                    fontFamily: 'Inter, sans-serif',
                    '&:hover': {
                      color: 'primary.main',
                    },
                  }}
                >
                  {page.label}
                </Button>
              ) : (
                <Button
                  key={page.label}
                  onClick={() => scrollToSection(page.sectionId)}
                  sx={{
                    mx: 1,
                    color: 'text.primary',
                    fontFamily: 'Inter, sans-serif',
                    '&:hover': {
                      color: 'primary.main',
                    },
                  }}
                >
                  {page.label}
                </Button>
              )
            )}
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            {renderAuthButtons()}
          </Box>

          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="navigation menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="primary"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{
                display: { xs: 'block', md: 'none' },
              }}
            >
              {pages.map((page) => (
                <MenuItem
                  key={page.label}
                  onClick={() => {
                    if (page.href) {
                      handleNavigation(page.href);
                    } else {
                      scrollToSection(page.sectionId);
                    }
                  }}
                >
                  <Typography textAlign="center" fontFamily="Inter, sans-serif">
                    {page.label}
                  </Typography>
                </MenuItem>
              ))}
              <Box sx={{ px: 2, py: 1 }}>
                {renderAuthButtons()}
              </Box>
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </MuiAppBar>
  );
}

export default AppBar;