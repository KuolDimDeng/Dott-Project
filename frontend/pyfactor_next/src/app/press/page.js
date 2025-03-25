'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import HomeIcon from '@mui/icons-material/Home';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import Paper from '@mui/material/Paper';
import { useTheme } from '@mui/material/styles';

export default function Press() {
  const theme = useTheme();
  const primaryColor = '#0a3d62'; // Navy blue to match About page
  const hoverColor = '#3c6382'; // Lighter navy blue for hover

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.background.default,
        py: { xs: 8, md: 12 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Container maxWidth="md">
        {/* Home Button */}
        <Box sx={{ mb: 6, display: 'flex', justifyContent: 'flex-start' }}>
          <Button
            variant="contained"
            component="a"
            href="/"
            startIcon={<HomeIcon />}
            sx={{
              backgroundColor: primaryColor,
              '&:hover': {
                backgroundColor: hoverColor,
              },
              borderRadius: '50px',
              fontFamily: '"Inter", sans-serif',
              fontWeight: 600,
              boxShadow: '0 4px 14px 0 rgba(10, 61, 98, 0.39)',
            }}
          >
            Back to Home
          </Button>
        </Box>

        {/* Under Development Message */}
        <Paper
          elevation={4}
          sx={{
            p: 6,
            borderRadius: 4,
            textAlign: 'center',
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <NewspaperIcon sx={{ fontSize: 80, color: primaryColor, mb: 3 }} />
          
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '2rem', md: '3rem' },
              fontWeight: 700,
              mb: 3,
              color: primaryColor,
              fontFamily: '"Poppins", sans-serif',
            }}
          >
            Press Page Under Development
          </Typography>
          
          <Typography
            variant="h5"
            sx={{
              color: theme.palette.text.secondary,
              fontFamily: '"Inter", sans-serif',
              mb: 4,
              maxWidth: '600px',
              mx: 'auto',
            }}
          >
            Our press and media resources section is coming soon!
          </Typography>
          
          <Typography
            variant="body1"
            sx={{
              color: theme.palette.text.secondary,
              fontFamily: '"Inter", sans-serif',
              fontSize: '1.1rem',
              lineHeight: 1.6,
              maxWidth: '700px',
              mx: 'auto',
            }}
          >
            We're currently developing a comprehensive press center with media resources, company news, and press releases. Check back soon for the latest updates on Dott's mission to empower small businesses.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}