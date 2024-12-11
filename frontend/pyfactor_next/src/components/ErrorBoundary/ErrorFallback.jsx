// src/components/ErrorBoundary/ErrorFallback.jsx
'use client';

import React from 'react';
import { Box, Button, Typography, Container, Paper } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <ErrorOutline
            sx={{
              fontSize: 60,
              color: 'error.main',
              mb: 2,
            }}
          />

          <Typography variant="h5" color="error" gutterBottom>
            Oops! Something went wrong
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {error.message || 'An unexpected error occurred'}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="contained" onClick={resetErrorBoundary} color="primary">
              Try again
            </Button>

            <Button variant="outlined" onClick={() => (window.location.href = '/')} color="primary">
              Go to Home
            </Button>
          </Box>

          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mt: 3, textAlign: 'left' }}>
              <Typography
                variant="caption"
                component="pre"
                sx={{
                  whiteSpace: 'pre-wrap',
                  bgcolor: 'grey.100',
                  p: 2,
                  borderRadius: 1,
                }}
              >
                {error.stack}
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
}

export default ErrorFallback;
