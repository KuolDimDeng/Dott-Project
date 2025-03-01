'use client';

import { Box, CircularProgress, Paper } from '@mui/material';

export default function SignInLoading() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 400,
          width: '100%',
          height: 400, // Match approximate height of sign-in form
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={48} />
      </Paper>
    </Box>
  );
}