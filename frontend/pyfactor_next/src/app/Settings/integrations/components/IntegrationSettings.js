import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Box,
  TextField,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';

const PLATFORMS = [
  { value: 'woocommerce', label: 'WooCommerce' },
  { value: 'shopify', label: 'Shopify' },
];

const IntegrationSettings = React.memo(
  ({ initialStatus, initialPlatform, initialBusinessData, title }) => {
    console.log('IntegrationSettings rendered', {
      initialStatus,
      initialPlatform,
      initialBusinessData,
      title,
    });
    const toast = useToast();

    const [businessData, setBusinessData] = useState(initialBusinessData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [wooCommerceData, setWooCommerceData] = useState({
      url: '',
      consumer_key: '',
      consumer_secret: '',
    });
    const [shopifyData, setShopifyData] = useState({
      shop: '',
    });
    const [connecting, setConnecting] = useState(false);
    const [currentPlatform, setCurrentPlatform] = useState('woocommerce');
    const [isShopifyConnected, setIsShopifyConnected] = useState(false);

    useEffect(() => {
      console.log('IntegrationSettings useEffect triggered', { initialBusinessData, loading });
      if (initialStatus && initialPlatform) {
        handleConnectionStatus(initialStatus, initialPlatform);
      }
    }, [initialStatus, initialPlatform]);

    const handleConnectionStatus = (status, platform) => {
      if (status === 'success' && platform === 'shopify') {
        addMessage('Successfully connected to Shopify!', 'info');
        setIsShopifyConnected(true);
      } else if (status === 'error' && platform === 'shopify') {
        addMessage('Failed to connect to Shopify. Please try again.', 'error');
        setIsShopifyConnected(false);
      }
      setCurrentPlatform('shopify');
    };

    const handleInputChange = (e, platform) => {
      const { name, value } = e.target;
      if (platform === 'woocommerce') {
        setWooCommerceData((prevData) => ({ ...prevData, [name]: value }));
      } else if (platform === 'shopify') {
        setShopifyData((prevData) => ({ ...prevData, [name]: value }));
      }
    };

    const handleConnectWooCommerce = async () => {
      setConnecting(true);
      try {
        const response = await useApi.post(
          '/api/integrations/connect-woocommerce/',
          wooCommerceData
        );
        addMessage(response.data.message, 'info');
      } catch (error) {
        addMessage(
          error.response?.data?.message || 'An error occurred while connecting to WooCommerce',
          'error'
        );
      } finally {
        setConnecting(false);
      }
    };

    const initiateShopifyOAuth = async () => {
      setConnecting(true);
      try {
        const response = await useApi.post('/api/integrations/initiate-shopify-oauth/', {
          shop: shopifyData.shop,
        });
        if (response.data.authUrl) {
          window.location.href = response.data.authUrl;
        } else {
          addMessage('Failed to initiate Shopify OAuth: No auth URL received', 'error');
        }
      } catch (error) {
        addMessage(
          error.response?.data?.message || 'An error occurred while initiating Shopify OAuth',
          'error'
        );
      } finally {
        setConnecting(false);
      }
    };

    const handleTabChange = (event, newValue) => {
      setCurrentPlatform(newValue);
    };

    console.log('IntegrationSettings rendering content', { businessData });

    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', p: 3 }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            {title || 'Integrations Settings'}
          </Typography>
          {isShopifyConnected && (
            <Typography variant="body1" sx={{ color: 'green', mb: 2 }}>
              Connected to Shopify
            </Typography>
          )}
          {businessData && businessData.business_type?.toLowerCase() === 'ecommerce' && (
            <>
              <Tabs
                value={currentPlatform}
                onChange={handleTabChange}
                aria-label="e-commerce platforms"
              >
                {PLATFORMS.map((platform) => (
                  <Tab key={platform.value} label={platform.label} value={platform.value} />
                ))}
              </Tabs>
              <Box mt={3}>
                {currentPlatform === 'woocommerce' && (
                  <>
                    <Typography variant="h5">WooCommerce</Typography>
                    <Typography variant="body1" mt={1}>
                      Connect to your WooCommerce store here.
                    </Typography>
                    <Box component="form" noValidate autoComplete="off" mt={2}>
                      <TextField
                        fullWidth
                        margin="normal"
                        name="url"
                        label="WooCommerce Store URL"
                        value={wooCommerceData.url}
                        onChange={(e) => handleInputChange(e, 'woocommerce')}
                      />
                      <TextField
                        fullWidth
                        margin="normal"
                        name="consumer_key"
                        label="Consumer Key"
                        value={wooCommerceData.consumer_key}
                        onChange={(e) => handleInputChange(e, 'woocommerce')}
                      />
                      <TextField
                        fullWidth
                        margin="normal"
                        name="consumer_secret"
                        label="Consumer Secret"
                        type="password"
                        value={wooCommerceData.consumer_secret}
                        onChange={(e) => handleInputChange(e, 'woocommerce')}
                      />
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleConnectWooCommerce}
                        disabled={connecting}
                        sx={{ mt: 2 }}
                      >
                        {connecting ? <CircularProgress size={24} /> : 'Connect to WooCommerce'}
                      </Button>
                    </Box>
                  </>
                )}
                {currentPlatform === 'shopify' && (
                  <>
                    <Typography variant="h5">Shopify</Typography>
                    <Typography variant="body1" mt={1}>
                      Connect to your Shopify store here.
                    </Typography>
                    <Box component="form" noValidate autoComplete="off" mt={2}>
                      <TextField
                        fullWidth
                        margin="normal"
                        name="shop"
                        label="Shopify Store URL"
                        value={shopifyData.shop}
                        onChange={(e) => handleInputChange(e, 'shopify')}
                        placeholder="yourstore.myshopify.com"
                      />
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={initiateShopifyOAuth}
                        disabled={connecting}
                        sx={{ mt: 2 }}
                      >
                        {connecting ? <CircularProgress size={24} /> : 'Connect to Shopify'}
                      </Button>
                    </Box>
                  </>
                )}
              </Box>
            </>
          )}
          {(!businessData || businessData.business_type?.toLowerCase() !== 'ecommerce') && (
            <Typography variant="body1">
              Integration settings are only available for e-commerce businesses.
            </Typography>
          )}
        </Paper>
      </Box>
    );
  }
);

export default IntegrationSettings;
