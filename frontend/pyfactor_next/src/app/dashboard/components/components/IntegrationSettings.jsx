import React, { useState, useEffect } from 'react';
import { Typography, Button, Box, CircularProgress } from '@mui/material';
import axiosInstance from '../components/axiosConfig';

const IntegrationSettings = React.memo(({ userData }) => {
  const [businessData, setBusinessData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        const response = await axiosInstance.get('/api/business/data/');
        setBusinessData(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load business data');
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, []);

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  const isEcommerce = businessData?.business_type?.toLowerCase() === 'ecommerce';
  const isProfessional = businessData?.subscriptions?.some(sub => sub.subscription_type.toLowerCase() === 'professional' && sub.is_active);

  return (
    <Box>
      <Typography variant="h4">Integrations Settings</Typography>
      {isEcommerce && isProfessional && (
        <>
          <Typography variant="h5" mt={2}>WooCommerce</Typography>
          <Typography variant="body1" mt={1}>Connect to your e-commerce data here.</Typography>
          <Button variant="contained" color="primary" sx={{ mt: 2 }}>
            Connect to WooCommerce
          </Button>
        </>
      )}
    </Box>
  );
});

export default IntegrationSettings;
