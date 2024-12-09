// src/components/LoadingState/LoadingStateWithProgress.js
import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
}));

export function LoadingStateWithProgress({ message = 'Loading...' }) {
  return (
    <LoadingContainer>
      <CircularProgress size={40} />
      <Typography variant="body1" color="textSecondary">
        {message}
      </Typography>
    </LoadingContainer>
  );
}

// Add PropTypes in development
if (process.env.NODE_ENV !== 'production') {
  const PropTypes = require('prop-types');
  
  LoadingStateWithProgress.propTypes = {
    message: PropTypes.string
  };
}