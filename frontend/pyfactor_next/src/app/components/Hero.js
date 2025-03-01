'use client';

import * as React from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Image from 'next/image';
import AuthButton from '@/components/AuthButton';

export default function Hero() {
  const theme = useTheme();

  return (
    <Box
      id="hero"
      sx={{
        width: '100%',
        backgroundImage:
          theme.palette.mode === 'light'
            ? 'linear-gradient(180deg, rgba(25, 118, 210, 0.05) 0%, rgba(25, 118, 210, 0.02) 100%)'
            : 'linear-gradient(180deg, rgba(100, 181, 246, 0.05) 0%, rgba(100, 181, 246, 0.02) 100%)',
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
            component="h1"
            variant="h1"
            align="center"
            sx={{
              fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
              color: theme.palette.mode === 'light' ? '#1976d2' : '#64b5f6',
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              mb: { xs: 3, sm: 4 },
              background:
                theme.palette.mode === 'light'
                  ? 'linear-gradient(45deg, #1976d2, #2196f3)'
                  : 'linear-gradient(45deg, #64b5f6, #90caf9)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Manage your business like a boss.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mb: { xs: 6, sm: 8 },
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: -20,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '60%',
                height: '1px',
                background:
                  theme.palette.mode === 'light'
                    ? 'linear-gradient(90deg, transparent, rgba(25, 118, 210, 0.2), transparent)'
                    : 'linear-gradient(90deg, transparent, rgba(100, 181, 246, 0.2), transparent)',
              },
            }}
          >
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
            sx={{
              color:
                theme.palette.mode === 'light'
                  ? alpha(theme.palette.text.primary, 0.7)
                  : alpha(theme.palette.text.primary, 0.8),
              fontWeight: 400,
              fontFamily: '"Inter", sans-serif',
              letterSpacing: '0.01em',
              fontSize: { xs: '1.1rem', sm: '1.3rem' },
              maxWidth: '800px',
              mx: 'auto',
              px: { xs: 2, sm: 4 },
              mb: { xs: 6, sm: 8 },
              lineHeight: 1.6,
            }}
          >
            Simple Accounting, Payroll, HR, Inventory, Reports, Analytics and
            Mobile Money—all in one intuitive platform.
          </Typography>

          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            alignItems="center"
            sx={{ mb: { xs: 8, sm: 10 } }}
          >
            <AuthButton size="large" />
          </Stack>

          <Box
            sx={{
              width: '100%',
              maxWidth: '1000px',
              mx: 'auto',
              px: { xs: 2, sm: 4 },
              position: 'relative',
              '&::before': {
                content: '""',
                display: 'block',
                paddingTop: '56.25%', // 16:9 aspect ratio
              },
              boxShadow:
                theme.palette.mode === 'light'
                  ? '0 4px 20px rgba(0, 0, 0, 0.1)'
                  : '0 4px 20px rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            {/* Replace YOUR_VIDEO_ID with actual video ID */}
            <iframe
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
              src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
              title="Dott Software Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
