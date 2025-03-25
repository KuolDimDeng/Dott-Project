// src/components/ErrorDisplay/ErrorDisplay.js
// src/components/ErrorDisplay/ErrorDisplay.js
import React from 'react';
import { Box, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const ErrorDisplay = ({ error }) => {
  const errorMessage = React.useMemo(() => {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (error?.message) return error.message;
    return 'An unexpected error occurred';
  }, [error]);

  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'error.lighter', borderRadius: 1 }}>
      <Typography color="error" variant="body2">
        {errorMessage}
      </Typography>
    </Box>
  );
};

ErrorDisplay.propTypes = {
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Error),
    PropTypes.object
  ]).isRequired
};

export default ErrorDisplay;