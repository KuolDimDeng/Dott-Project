'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from "next-auth/react";
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
  CircularProgress
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Image from 'next/image';

const pages = [
  { label: 'About', href: '/about' },
  { label: 'Features', sectionId: 'features' },
  { label: 'Pricing', sectionId: 'pricing' },
  { label: 'FAQ', sectionId: 'faq' },
  { label: 'Contact', sectionId: 'contact' }
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
    await signOut({ redirect: false });
    router.push('/');
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
            />
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
            {pages.map((page) => (
              page.href ? (
                <Button
                  key={page.label}
                  component={Link}
                  href={page.href}
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
            ))}
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            {status === 'loading' ? (
              <CircularProgress size={24} />
            ) : status === 'authenticated' ? (
              <>
                <Button
                  variant="contained"
                  component={Link}
                  href="/dashboard"
                  sx={{
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Your Account
                </Button>
                <Button
                  variant="text"
                  onClick={handleLogout}
                  sx={{
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Log Out
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                component={Link}
                href="/auth/signin"
                sx={{
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Sign In / Sign Up
              </Button>
            )}
          </Box>

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
                      router.push(page.href);
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
              {status === 'loading' ? (
                <CircularProgress size={24} />
              ) : status === 'authenticated' ? (
                <>
                  <MenuItem>
                    <Button
                      fullWidth
                      variant="contained"
                      component={Link}
                      href="/dashboard"
                      sx={{
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      Your Account
                    </Button>
                  </MenuItem>
                  <MenuItem>
                    <Button
                      fullWidth
                      variant="text"
                      onClick={handleLogout}
                      sx={{
                        color: 'text.primary',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      Log Out
                    </Button>
                  </MenuItem>
                </>
              ) : (
                <MenuItem>
                  <Button
                    fullWidth
                    variant="contained"
                    component={Link}
                    href="/auth/signin"
                    sx={{
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Sign In / Sign Up
                  </Button>
                </MenuItem>
              )}
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default AppAppBar;