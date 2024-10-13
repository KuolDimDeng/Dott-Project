'use client';

import * as React from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Image from 'next/image';

export default function Hero() {
  const theme = useTheme();
  
  const babyBlueMain = '#03a9f4';
  const babyBlueDark = '#81d4fa';
  
  return (
    <Box
      id="hero"
      sx={{
        width: '100%',
        backgroundRepeat: 'no-repeat',
        color: theme.palette.mode === 'light' ? '#333' : '#FFF',
      }}
    >
      <Container
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pt: { xs: 14, sm: 20 },
          pb: { xs: 8, sm: 12 },
          position: 'relative',
        }}
      >
        <Stack spacing={3} sx={{ width: { xs: '100%', sm: '80%' } }}>
          <Typography
            variant="h1"
            align="center"
            sx={{
              fontSize: 'clamp(2rem, 8vw, 3rem)',
              color: theme.palette.mode === 'light' ? '#1976d2' : '#64b5f6',
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 400,
              letterSpacing: '-0.01em',
            }}
          >
            Manage your business like a boss.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 10 }}>
            <Image
              src="/static/images/Work-Life-Balance-1--Streamline-Brooklyn.png"
              alt="Business Management Illustration"
              width={250}
              height={180}
              priority
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </Box>
          
          <Typography
            variant="h5"
            align="center"
            color="text.secondary"
            sx={{
              fontWeight: 'normal',
              fontFamily: '"Inter", sans-serif',
              letterSpacing: '0.01em',
              fontSize: '1.3rem',
              padding: 2,
            }}
          >
            Simple Accounting, Payroll, HR, Inventory, Reports, Analytics and Mobile Money—all in one intuitive platform.
          </Typography>
          
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            alignItems="center"
          >
            <Button
              variant="contained"
              size="large"
              sx={{
                fontSize: '1rem',
                px: 4,
                py: 1.5,
                backgroundColor: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
                boxShadow: `0 4px 14px ${alpha(babyBlueMain, 0.4)}`,
                borderRadius: '50px',
                fontFamily: '"Inter", sans-serif',
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              Get Started Free
            </Button>
          </Stack>
          
          <Box sx={{ width: '100%', mt: 2, padding: 4 }}>
            <iframe
              width="100%"
              height="480"
              src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
              title="Dott Software Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}