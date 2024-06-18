'use client';
import * as React from 'react';
import PropTypes from 'prop-types';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AppAppBar from './components/AppAppBar';
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

export default function LandingPage() {
  const mode = 'dark';
  const LPtheme = createTheme(getLPTheme(mode));
  const router = useRouter();

  const handleSignInClick = () => {
    router.push('/api/login/page');
  };

  const handleSignUpClick = () => {
    router.push('/register/page');
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
        <LogoCollection />
        <Features />
        <Testimonials />
        <Highlights />
        <Pricing />
        <FAQ />
        <Divider />
        <Footer />
      </Box>
    </ThemeProvider>
  );
}
export function ToggleColorMode() {
    return (
      <Box>
        <Button color="primary" aria-label="dark mode" component="a" sx={{ ml: 1 }}>
          <ModeNightRoundedIcon />
        </Button>
      </Box>
    );
  }
