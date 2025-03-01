'use client';

import React from 'react';
import { Box, Container, Grid, Typography, Paper } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import SupportIcon from '@mui/icons-material/Support';

const highlights = [
  {
    icon: <SpeedIcon sx={{ fontSize: 40 }} />,
    title: 'Fast & Efficient',
    description:
      'Our platform is optimized for speed and efficiency, helping you manage your business faster than ever.',
  },
  {
    icon: <SecurityIcon sx={{ fontSize: 40 }} />,
    title: 'Secure & Reliable',
    description:
      'Bank-level security with regular backups ensures your business data is always safe and accessible.',
  },
  {
    icon: <SupportIcon sx={{ fontSize: 40 }} />,
    title: '24/7 Support',
    description:
      'Our dedicated support team is available around the clock to help you with any questions or issues.',
  },
];

export default function Highlights() {
  return (
    <Box
      sx={{
        py: { xs: 8, sm: 12 },
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ mb: { xs: 6, sm: 8 }, textAlign: 'center' }}>
          <Typography
            component="h2"
            variant="h2"
            sx={{
              mb: 2,
              background: (theme) =>
                theme.palette.mode === 'light'
                  ? 'linear-gradient(45deg, #1976d2, #2196f3)'
                  : 'linear-gradient(45deg, #64b5f6, #90caf9)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Why Choose Us
          </Typography>
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{ maxWidth: 800, mx: 'auto' }}
          >
            Experience the difference with our cutting-edge platform
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {highlights.map((highlight, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  borderRadius: 2,
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) =>
                      theme.palette.mode === 'light'
                        ? '0 4px 20px rgba(0,0,0,0.1)'
                        : '0 4px 20px rgba(0,0,0,0.3)',
                  },
                }}
              >
                <Box
                  sx={{
                    mb: 2,
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {highlight.icon}
                </Box>
                <Typography
                  variant="h5"
                  component="h3"
                  gutterBottom
                  sx={{ fontWeight: 600 }}
                >
                  {highlight.title}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {highlight.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
