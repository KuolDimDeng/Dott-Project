'use client';

import { memo, Suspense } from 'react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PropTypes from 'prop-types';

// Import your components
import AppBar from '@/app/components/AppBar';
import Hero from '@/app/components/Hero';
import Features from '@/app/components/Features';
import Highlights from '@/app/components/Highlights';
import Pricing from '@/app/components/Pricing';
import FAQ from '@/app/components/FAQ';
import Footer from '@/app/components/Footer';

// Loading component
const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
    >
      <CircularProgress />
    </Box>
  );
});

// Error state component
const ErrorState = memo(function ErrorState({ error, onRetry }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      gap={2}
      p={3}
    >
      <Typography variant="h6" color="error">
        {error.message || 'Something went wrong'}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {error.response?.status === 401
          ? 'Your session has expired. Please sign in again.'
          : 'Please try again or contact support@dottapps.com if the problem persists.'}
      </Typography>
      <Button variant="contained" onClick={onRetry} startIcon={<RefreshIcon />}>
        Try Again
      </Button>
    </Box>
  );
});

// PropTypes definitions
ErrorState.propTypes = {
  error: PropTypes.shape({
    message: PropTypes.string,
    response: PropTypes.shape({
      status: PropTypes.number,
    }),
  }).isRequired,
  onRetry: PropTypes.func.isRequired,
};

// Landing content component
const LandingContent = memo(function LandingContent() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AppBar />
      <Hero />
      <Suspense fallback={<LoadingSpinner />}>
        <>
          <Features />
          <Highlights />
          <Pricing />
          <FAQ />
          <Footer />
        </>
      </Suspense>
    </Suspense>
  );
});

LandingContent.displayName = 'LandingContent';

// Main component
export default function Home() {
  return <LandingContent />;
}
