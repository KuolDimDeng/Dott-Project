// src/components/ErrorStep/ErrorStep.js
import React from 'react';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { logger } from '@/utils/logger';

export function ErrorStep({ 
  error, 
  stepNumber, 
  onRetry, 
  isRetrying = false,
  message
}) {
  // Log error for debugging
  React.useEffect(() => {
    if (error) {
      logger.error(`Step ${stepNumber} error:`, error);
    }
  }, [error, stepNumber]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      p={3}
      gap={2}
    >
      <Alert
        severity="error"
        action={
          <Button
            color="inherit"
            size="small"
            onClick={onRetry}
            disabled={isRetrying}
            startIcon={isRetrying && <CircularProgress size={16} />}
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Button>
        }
        sx={{ 
          maxWidth: 500, 
          width: '100%',
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          {message || `Error in Step ${stepNumber}`}
        </Typography>
        {error?.message && (
          <Typography variant="body2" color="textSecondary">
            {error.message}
          </Typography>
        )}
      </Alert>
    </Box>
  );
}

// Add PropTypes
if (process.env.NODE_ENV !== 'production') {
  const PropTypes = require('prop-types');
  
  ErrorStep.propTypes = {
    error: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        message: PropTypes.string,
        code: PropTypes.string
      })
    ]),
    stepNumber: PropTypes.number.isRequired,
    onRetry: PropTypes.func.isRequired,
    isRetrying: PropTypes.bool,
    message: PropTypes.string
  };
}