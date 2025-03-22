'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Container, Paper, Typography, TextField, Button, Alert, CircularProgress, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import useOnboardingStore from '@/store/onboardingStore';
import {
  businessTypes,
  legalStructures
} from '@/app/utils/businessData';
import { logger } from '@/utils/logger';
import { validateSession } from '@/utils/onboardingUtils';
import { getRefreshedAccessToken } from '@/utils/auth';
import countryList from 'react-select-country-list';
import { ONBOARDING_STATES } from '../state/OnboardingStateManager';
import { appendLanguageParam, getLanguageQueryString } from '@/utils/languageUtils';

// Business state functionality removed as requested

// Create a safe version of useToast that doesn't throw if ToastProvider is not available
const useSafeToast = () => {
  try {
    // Try to import and use the real useToast
    const { useToast } = require('@/components/Toast/ToastProvider');
    return useToast();
  } catch (error) {
    // Return a dummy implementation if ToastProvider is not available
    return {
      success: (message) => console.log('[Toast Success]', message),
      error: (message) => console.error('[Toast Error]', message),
      info: (message) => console.info('[Toast Info]', message),
      warning: (message) => console.warn('[Toast Warning]', message),
    };
  }
};

// Business subtypes functionality removed as requested

export default function BusinessInfoPage() {
  const router = useRouter();
  const toast = useSafeToast();
  const { businessInfo, setBusinessInfo, isLoading, error } = useOnboardingStore();
  const countries = useMemo(() => countryList().getData(), []);
  
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    country: '',
    legalStructure: '',
    dateFounded: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (businessInfo) {
      setFormData({
        businessName: businessInfo.businessName || '',
        businessType: businessInfo.businessType || '',
        country: businessInfo.country || '',
        legalStructure: businessInfo.legalStructure || '',
        dateFounded: businessInfo.dateFounded || new Date().toISOString().split('T')[0],
      });
    }
  }, [businessInfo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (formError) setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      // Validate required fields
      const requiredFields = ['businessName', 'businessType', 'country', 'legalStructure', 'dateFounded'];
      const missingFields = requiredFields.filter(field => !formData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      }

      // Get auth session with tokens
      const { tokens } = await validateSession();
      if (!tokens?.accessToken || !tokens?.idToken) {
        throw new Error('No valid session tokens');
      }

      // Ensure we have a fresh token
      let accessToken = tokens.accessToken.toString();
      const idToken = tokens.idToken.toString();
      
      // Try to refresh the token before making the API request
      try {
        const refreshedToken = await getRefreshedAccessToken();
        if (refreshedToken) {
          logger.info('[BusinessInfo] Using refreshed token for API request');
          accessToken = refreshedToken;
        }
      } catch (refreshError) {
        logger.warn('[BusinessInfo] Token refresh failed, using original token:', refreshError);
        // Continue with original token
      }
      
      logger.debug('[BusinessInfo] Making API request:', {
        token: accessToken.substring(0, 20) + '...', // Log first 20 chars of token
        formData,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Id-Token': idToken
        }
      });

      // Submit business info to API with auth tokens
      let response = await fetch('/api/onboarding/business-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Id-Token': idToken
        },
        body: JSON.stringify(formData),
      });

      // Handle 401 Unauthorized errors by trying again with a forced token refresh
      if (response.status === 401) {
        logger.warn('[BusinessInfo] Received 401 Unauthorized, attempting token refresh and retry');
        
        // Force token refresh
        const forcedRefreshToken = await getRefreshedAccessToken();
        if (!forcedRefreshToken) {
          throw new Error('Token refresh failed after 401 error');
        }
        
        // Retry the request with the new token
        logger.info('[BusinessInfo] Retrying request with fresh token');
        response = await fetch('/api/onboarding/business-info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${forcedRefreshToken}`,
            'X-Id-Token': idToken
          },
          body: JSON.stringify(formData),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          logger.error('[BusinessInfo] API retry request failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          throw new Error(errorData.message || 'Failed to update business information after token refresh');
        }
      } else if (!response.ok) {
        const errorData = await response.json();
        logger.error('[BusinessInfo] API request failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.message || 'Failed to update business information');
      }

      const data = await response.json();
      
      // Update store
      const success = await setBusinessInfo(formData);
      
      if (!success) {
        throw new Error('Failed to update business information');
      }

      logger.debug('[BusinessInfo] Successfully updated business info:', data);
      
      // Check if there's a warning message
      if (data.warning) {
        logger.warn('[BusinessInfo] Warning from API:', data.warning);
        toast.warning(`Business information saved with warning: ${data.warning}`);
      } else {
        toast.success('Business information saved successfully');
      }
      
      // ALWAYS redirect to subscription page regardless of API response
      logger.debug('[BusinessInfo] Force redirecting to subscription page');

      // Set cookie with the next step
      document.cookie = `onboardingStep=subscription; path=/; max-age=${60 * 60 * 24 * 7}`;
      document.cookie = `onboardedStatus=BUSINESS_INFO; path=/; max-age=${60 * 60 * 24 * 7}`;

      // Get the language query string using our utility
      const langQueryString = getLanguageQueryString();

      // Use window.location for a full page reload instead of router.push
      // This ensures all cookies are properly set before redirection
      window.location.href = `/onboarding/subscription${langQueryString}`;

    } catch (error) {
      logger.error('[BusinessInfo] Form submission failed:', error);
      setFormError(error.message);
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          py: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}
        >
          <Typography variant="h5" component="h1" gutterBottom align="center">
            Business Information
          </Typography>

          {(error || formError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error || formError}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3
            }}
          >
            <TextField
              required
              fullWidth
              id="businessName"
              name="businessName"
              label="Business Name"
              value={formData.businessName}
              onChange={handleChange}
              disabled={submitting}
            />

            <FormControl fullWidth required>
              <InputLabel id="businessType-label">Business Type</InputLabel>
              <Select
                labelId="businessType-label"
                id="businessType"
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                disabled={submitting}
                label="Business Type"
              >
                {businessTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Business Subtypes field removed as requested */}

            <FormControl fullWidth required>
              <InputLabel id="country-label">Country</InputLabel>
              <Select
                labelId="country-label"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                disabled={submitting}
                label="Country"
              >
                {countries.map((country) => (
                  <MenuItem key={country.value} value={country.value}>
                    {country.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Business State field removed as requested */}

            <FormControl fullWidth required>
              <InputLabel id="legalStructure-label">Legal Structure</InputLabel>
              <Select
                labelId="legalStructure-label"
                id="legalStructure"
                name="legalStructure"
                value={formData.legalStructure}
                onChange={handleChange}
                disabled={submitting}
                label="Legal Structure"
              >
                {legalStructures.map((structure) => (
                  <MenuItem key={structure} value={structure}>
                    {structure}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              required
              fullWidth
              id="dateFounded"
              name="dateFounded"
              label="Date Founded"
              type="date"
              value={formData.dateFounded}
              onChange={handleChange}
              disabled={submitting}
              InputLabelProps={{
                shrink: true,
              }}
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={submitting}
              sx={{ mt: 2 }}
            >
              {submitting ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} color="inherit" />
                  Saving...
                </Box>
              ) : (
                'Continue'
              )}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
