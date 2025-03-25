import React from 'react';
import { Box, Typography } from '@mui/material';

const HomePage = () => {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ backgroundColor: 'background.default', p: 3, borderRadius: 2 }}
    >
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
        This is home page
      </Typography>
    </Box>
  );
};

export default HomePage;
