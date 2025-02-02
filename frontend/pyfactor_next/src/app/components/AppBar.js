///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/components/AppBar.js
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  AppBar,
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
import { validateUserState, AUTH_ERRORS } from '@/lib/authUtils';
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

function AppAppBar() {
  const router = useRouter();
  const [anchorElNav, setAnchorElNav] = useState(null);
  const { data: session, status } = useSession();
  const [userState, setUserState] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let mounted = true;

    const validateUser = async () => {
      if (status !== 'authenticated' || !session) return;

      try {
        setIsValidating(true);
        const validationResult = await validateUserState(session, requestId);

        if (!mounted) return;

        setUserState({
          isValid: validationResult.isValid,
          redirectTo: validationResult.redirectTo,
          reason: validationResult.reason
        });
      } catch (error) {
        logger.error('User validation failed:', {
          requestId,
          error: error.message,
          status: error.response?.status
        });
      } finally {
        if (mounted) setIsValidating(false);
      }
    };

    validateUser();

    return () => {
      mounted = false;
    };
  }, [session, status, requestId]);

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const scrollToSection = (sectionId) => {
    const currentPath = router.pathname;

    if (currentPath === '/' || currentPath === '/#' + sectionId) {
      const sectionElement = document.getElementById(sectionId);
      const offset = 128;
      if (sectionElement) {
        const targetScroll = sectionElement.offsetTop - offset;
        sectionElement.scrollIntoView({ behavior: 'smooth' });
        window.scrollTo({
          top: targetScroll,
          behavior: 'smooth',
        });
        handleCloseNavMenu();
      }
    } else {
      router.push(`/?section=${sectionId}`);
      handleCloseNavMenu();
    }
  };

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      router.push('/');
    } catch (error) {
      logger.error('Logout failed:', {
        requestId,
        error: error.message
      });
    }
  };

  const handleNavigation = (path) => {
    router.push(path);
  };

  const getButtonProps = () => {
    if (!userState?.isValid) {
      return {
        text: 'Complete Setup',
        route: userState?.redirectTo || '/onboarding/business-info',
        icon: <SettingsIcon />
      };
    }

    if (userState.reason === AUTH_ERRORS.ALL_VALID) {
      return {
        text: 'Dashboard',
        route: '/dashboard',
        icon: <DashboardIcon />
      };
    }

    return {
      text: 'Start Setup',
      route: '/onboarding/business-info',
      icon: <SettingsIcon />
    };
  };

  const renderAuthButtons = () => {
    if (status === 'loading' || isValidating) {
      return <CircularProgress size={24} />;
    }

    if (status === 'authenticated') {
      const buttonProps = getButtonProps();
      return (
        <>
          <Button 
            variant="contained"
            onClick={() => handleNavigation(buttonProps.route)}
            startIcon={buttonProps.icon}
          >
            {buttonProps.text}
          </Button>
          <Button variant="text" onClick={handleLogout}>
            Log Out
          </Button>
        </>
      );
    }

    return (
      <Button variant="contained" onClick={() => handleNavigation('/auth/signin')}>
        Sign In / Sign Up
      </Button>
    );
  };

  return (
    <AppBar position="fixed" sx={{ bgcolor: 'white', boxShadow: 1 }}>
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

          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>{renderAuthButtons()}</Box>

          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="account of current user"
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
                    handleCloseNavMenu();
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
              {renderAuthButtons()}
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default AppAppBar;