'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Container, CircularProgress } from '@mui/material';
import Image from 'next/image';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
});

const images = [
  '/static/images/Be-Patient-2--Streamline-Brooklyn.png',
  '/static/images/Be-Patient-3--Streamline-Brooklyn.png',
  '/static/images/Waiting-3--Streamline-Brooklyn.png'
];

const OnboardingComplete = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const imageInterval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000);

    const progressInterval = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress >= 100) {
          clearInterval(progressInterval);
          clearInterval(imageInterval);
          router.push('/dashboard');
          return 100;
        }
        return prevProgress + 10;
      });
    }, 1000);

    return () => {
      clearInterval(imageInterval);
      clearInterval(progressInterval);
    };
  }, [router]);

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Image src="/static/images/Pyfactor.png" alt="Pyfactor Logo" width={150} height={50} priority />
          <Typography variant="h4" sx={{ mt: 2, mb: 4 }}>Congratulations!</Typography>
          <Typography variant="h6" sx={{ mb: 2 }}>Your account is being set up</Typography>
        </Box>
        <Box sx={{ position: 'relative', width: 300, height: 300, mb: 4 }}>
          <Image
            src={images[currentImageIndex]}
            alt="Setup in progress"
            layout="fill"
            objectFit="contain"
          />
        </Box>
        <Box sx={{ width: '100%', mb: 2 }}>
          <CircularProgress variant="determinate" value={progress} size={60} thickness={4} />
        </Box>
        <Typography variant="body1">
          {progress < 100 ? 'Setting up your account...' : 'Setup complete! Redirecting to dashboard...'}
        </Typography>
      </Container>
    </ThemeProvider>
  );
};

export default OnboardingComplete;