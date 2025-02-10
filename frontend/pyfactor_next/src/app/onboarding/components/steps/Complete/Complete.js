'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Typography, Box, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { logger } from '@/utils/logger';
import { useSession } from '@/hooks/useSession';

export function Complete() {
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    logger.debug('Complete step mounted');

    // Redirect to dashboard after a short delay
    const timer = setTimeout(() => {
      router.replace('/dashboard');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 3,
        }}
      >
        <CheckCircleIcon
          sx={{
            fontSize: 80,
            color: 'success.main',
            mb: 2,
          }}
        />

        <Typography variant="h4" component="h1" gutterBottom>
          Setup Complete
        </Typography>

        <Typography variant="h6" color="text.secondary" gutterBottom>
          Your workspace is ready
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          Welcome, {session?.user?.attributes?.['custom:firstname'] || 'User'}!
          Your account has been fully configured and you can now access all
          features.
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontStyle: 'italic' }}
        >
          Redirecting to dashboard...
        </Typography>

        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={() => router.replace('/dashboard')}
          sx={{ mt: 2 }}
        >
          Go to Dashboard
        </Button>
      </Box>
    </Container>
  );
}

export default Complete;
