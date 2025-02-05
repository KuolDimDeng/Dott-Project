'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import PropTypes from 'prop-types';
import {
  Container,
  Grid,
  Typography,
  Box,
  CircularProgress,
  Alert,
  TextField,
  Button,
  MenuItem,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { logger } from '@/utils/logger';
import { useAuth } from '@/hooks/useAuth';
import { updateUserAttributes } from '@/config/amplify';

const BUSINESS_TYPES = [
  'Sole Proprietorship',
  'Partnership',
  'LLC',
  'Corporation',
  'Non-Profit',
  'Other',
];

const LEGAL_STRUCTURES = [
  'Single Member LLC',
  'Multi-Member LLC',
  'S Corporation',
  'C Corporation',
  'General Partnership',
  'Limited Partnership',
  'Sole Proprietorship',
];

export function BusinessInfo({ onNext }) {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const { signOut } = useAuth();
  const [error, setError] = React.useState(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      business_name: '',
      business_type: '',
      country: '',
      legal_structure: '',
      date_founded: '',
      first_name: '',
      last_name: '',
    }
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Update user attributes in Cognito
      await updateUserAttributes({
        'custom:business_name': data.business_name,
        'custom:business_type': data.business_type,
        'custom:country': data.country,
        'custom:legal_structure': data.legal_structure,
        'custom:date_founded': data.date_founded,
        'custom:first_name': data.first_name,
        'custom:last_name': data.last_name,
        'custom:onboarding': 'subscription'
      });

      // Update session to reflect new attributes
      await update();

      logger.debug('Business info updated successfully');
      onNext();
    } catch (error) {
      logger.error('Failed to update business info:', error);
      setError(error.message || 'Failed to update business information');

      if (error.code === 'NotAuthorizedException') {
        await signOut();
        router.push('/auth/signin');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Business Information
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Please provide your business details to get started.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Controller
                name="business_name"
                control={control}
                rules={{ required: 'Business name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Business Name"
                    error={!!errors.business_name}
                    helperText={errors.business_name?.message}
                    disabled={isSubmitting}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="business_type"
                control={control}
                rules={{ required: 'Business type is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    label="Business Type"
                    error={!!errors.business_type}
                    helperText={errors.business_type?.message}
                    disabled={isSubmitting}
                  >
                    {BUSINESS_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="legal_structure"
                control={control}
                rules={{ required: 'Legal structure is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    label="Legal Structure"
                    error={!!errors.legal_structure}
                    helperText={errors.legal_structure?.message}
                    disabled={isSubmitting}
                  >
                    {LEGAL_STRUCTURES.map((structure) => (
                      <MenuItem key={structure} value={structure}>
                        {structure}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="country"
                control={control}
                rules={{ required: 'Country is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Country"
                    error={!!errors.country}
                    helperText={errors.country?.message}
                    disabled={isSubmitting}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="date_founded"
                control={control}
                rules={{ required: 'Date founded is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="date"
                    label="Date Founded"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.date_founded}
                    helperText={errors.date_founded?.message}
                    disabled={isSubmitting}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="first_name"
                control={control}
                rules={{ required: 'First name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="First Name"
                    error={!!errors.first_name}
                    helperText={errors.first_name?.message}
                    disabled={isSubmitting}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="last_name"
                control={control}
                rules={{ required: 'Last name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Last Name"
                    error={!!errors.last_name}
                    helperText={errors.last_name?.message}
                    disabled={isSubmitting}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isSubmitting}
                sx={{ mt: 3, mb: 2 }}
              >
                {isSubmitting ? <CircularProgress size={24} /> : 'Continue'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
}

BusinessInfo.propTypes = {
  onNext: PropTypes.func.isRequired,
};

export default BusinessInfo;
