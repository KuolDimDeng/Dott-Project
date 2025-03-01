'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Container, Paper, Typography, TextField, Button, Alert, CircularProgress, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import useOnboardingStore from '@/store/onboardingStore';
import { businessTypes, legalStructures } from '@/app/utils/businessData';
import { logger } from '@/utils/logger';
import { validateSession } from '@/utils/onboardingUtils';
import { useToast } from '@/components/Toast/ToastProvider';
import countryList from 'react-select-country-list';
import { ONBOARDING_STATES } from '../state/OnboardingStateManager';

export default function BusinessInfoPage() {
  const router = useRouter();
  const toast = useToast();
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

      const accessToken = tokens.accessToken.toString();
      const idToken = tokens.idToken.toString();
      
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
      const response = await fetch('/api/onboarding/business-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Id-Token': idToken
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('[BusinessInfo] API request failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.message || 'Failed to update business information');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update business information');
      }

      const data = await response.json();
      
      // Update store
      const success = await setBusinessInfo(formData);
      
      if (!success) {
        throw new Error('Failed to update business information');
      }

      logger.debug('[BusinessInfo] Successfully updated business info');
      toast.success('Business information saved successfully');
      
      // Set cookie with the next step
      const nextStep = data.nextStep || ONBOARDING_STATES.SUBSCRIPTION;
      document.cookie = `onboardingStep=${nextStep.toLowerCase().replace('_', '-')}; path=/`;
      
      // Navigate to next step using the route from API response
      if (data.nextRoute) {
        router.push(data.nextRoute);
      } else {
        logger.error('[BusinessInfo] No next route provided in API response');
        // Fallback to default route
        router.push('/onboarding/subscription');
      }

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
