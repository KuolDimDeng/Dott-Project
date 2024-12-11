// components/StatusMessage.jsx
import React from 'react';
import { Box, Typography } from '@mui/material';

const StatusMessage = ({ status, message }) => (
  <Box
    mt={2}
    mb={2}
    p={2}
    bgcolor={status === 'success' ? 'success.light' : 'error.light'}
    borderRadius={1}
  >
    <Typography color={status === 'success' ? 'success.main' : 'error.main'}>{message}</Typography>
  </Box>
);

export default StatusMessage;
