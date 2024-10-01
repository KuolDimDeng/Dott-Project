'use client';
import * as React from 'react';
import { useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AppAppBar from './components/AppBar';
import Hero from './components/Hero';
import LogoCollection from './components/LogoCollection';
import Highlights from './components/Highlights';
import Pricing from './components/Pricing';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import getLPTheme from './getLPTheme';
import { useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import ModeNightRoundedIcon from '@mui/icons-material/ModeNightRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';

export default function LandingPage() {
  const [mode, setMode] = useState('light'); // Set default to light mode
  const LPtheme = createTheme(getLPTheme(mode));
  const router = useRouter();

  const handleSignInClick = () => {
    router.push('/api/login/page');
  };

  const handleSignUpClick = () => {
    router.push('/register/page');
  };

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeProvider theme={LPtheme}>
      <CssBaseline />
      <Box sx={{ overflowX: 'hidden', backgroundColor: 'background.default' }}>
        <AppAppBar />
        <Hero
          onSignInClick={handleSignInClick}
          onSignUpClick={handleSignUpClick}
        />
        <Features />
        <Pricing />
        <FAQ />
        <Divider />
        <Footer />
      </Box>
    </ThemeProvider>
  );
}
export function ToggleColorMode({ toggleColorMode, mode }) {
  return (
    <Box sx={{ position: 'fixed', bottom: 16, right: 16 }}>
      <Button
        color="primary"
        aria-label="toggle light/dark mode"
        onClick={toggleColorMode}
        startIcon={mode === 'light' ? <ModeNightRoundedIcon /> : <LightModeRoundedIcon />}
      >
        {mode === 'light' ? 'Dark Mode' : 'Light Mode'}
      </Button>
    </Box>
  );
}
