////Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/Step1.js
'use client';

// React and Next.js
import React, { useState, useEffect, memo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// MUI Components
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Button,
  Container,
  Grid,
  Paper,
  Box,
  CircularProgress,
} from '@mui/material';

// Form Handling
import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Local Components and Hooks
import { useStep1Form } from './useStep1Form';
import { useToast } from '@/components/Toast/ToastProvider';
import { OnboardingErrorBoundary } from '@/components/ErrorBoundary/OnboardingErrorBoundary';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { ErrorStep } from '@/components/ErrorStep';

// Utils and Config
import { countries } from '@/app/countryList/page';
import { businessTypes, legalStructures } from '@/app/utils/businessData';
import { logger } from '@/utils/logger';
import { persistenceService } from '@/services/persistenceService';
import { theme } from './Step1.styles';
import APP_CONFIG from '@/config';

// PropTypes (development only)
import PropTypes from 'prop-types';

// Separate the core component logic
const Step1Core = memo(function Step1Core({
  metadata,
  methods,
  handleChange,
  formRef,
  saveDraft,
  initialization,
  isLoading,
  isSubmitting,
  setIsSubmitting,
  session,
  sessionStatus,
  toast,
  router,
  onRecovery,
  defaultValues, // Add this to props destructuring
  handleSubmit,
}) {
  const [formKey, setFormKey] = useState(0);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Error handling
  if (initialization.error) {
    return <ErrorStep error={initialization.error} stepNumber={1} onRetry={onRecovery} />;
  }

  useEffect(() => {
    return () => {
      if (formRef.current && !isSubmitting) {
        saveDraft(methods.getValues()).catch((error) => {
          logger.error('Failed to save draft on unmount:', error);
        });
      }
    };
  }, [saveDraft, methods, isSubmitting, formRef]); // Add formRef to dependencies

  useEffect(() => {
    return () => {
      toast.dismiss(); // Clear any pending toasts on unmount
    };
  }, [toast]); // Add toast dependency

  // 6. All useEffects grouped together
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Form State:', methods.formState);
      console.log('Form Values:', methods.getValues());
    }
  }, [methods.formState, methods]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (methods.formState.isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [methods.formState.isDirty]);

  // Update the useEffect
  useEffect(() => {
    let timeoutId;

    if (methods.formState.isDirty) {
      setIsSavingDraft(true);
      timeoutId = setTimeout(async () => {
        try {
          await saveDraft(methods.getValues());
        } catch (error) {
          logger.error('Failed to save draft:', error);
        } finally {
          setIsSavingDraft(false);
        }
      }, 1000); // Debounce draft saves
    }

    return () => {
      clearTimeout(timeoutId);
      setIsSavingDraft(false);
    };
  }, [methods, saveDraft, methods.formState.isDirty]);

  const getFieldError = (fieldName) => {
    const error = methods.formState.errors[fieldName];
    return error?.message || '';
  };

  const getFormControlError = (fieldName) => {
    const error = methods.formState.errors[fieldName];
    return {
      error: !!error,
      helperText: error?.message || '',
    };
  };

  // Form submission
  // Step1.js
  const onSubmit = async (data) => {
    let toastId;

    try {
      if (!handleSubmit) {
        throw new Error('Form submission handler not provided');
      }

      if (!initialization.isInitialized) {
        throw new Error('Form not initialized');
      }

      if (!session?.user?.id) {
        toast.error('Please sign in to continue');
        router.replace('/auth/signin');
        return;
      }

      setIsSubmitting(true);
      // Use toast.loading instead of toast.update
      toast.loading('Saving your information...');

      const formattedData = {
        ...data,
        dateFounded: new Date(data.dateFounded).toISOString().split('T')[0],
        userId: session.user.id,
        email: session.user.email,
      };

      await handleSubmit(formattedData);
      await persistenceService.clearData('step1-form_drafts');

      // Use separate success toast
      toast.dismiss();
      toast.success('Business information saved successfully');

      await router.push('/onboarding/step2');
    } catch (error) {
      console.error('Form submission error:', error);
      // Use separate error toast
      toast.dismiss();
      toast.error(error.message || 'Failed to submit form');

      await saveDraft(data).catch((draftError) => {
        console.error('Failed to save draft:', draftError);
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add reset handler
  // Update handleFormReset to use this
  const handleFormReset = useCallback(async () => {
    try {
      if (
        !window.confirm(
          'Are you sure you want to reset the form? All unsaved changes will be lost.'
        )
      ) {
        return;
      }

      await persistenceService.clearData('step1-form_drafts');
      methods.reset(defaultValues); // Now defaultValues is from props
      setFormKey((prev) => prev + 1);
      toast.success('Form reset successfully');
    } catch (error) {
      logger.error('Failed to reset form:', error);
      toast.error('Failed to reset form');
    }
  }, [methods, toast, defaultValues]); // defaultValues dependency is valid now

  // Update the loading check
  if (isLoading) {
    return (
      <LoadingStateWithProgress
        message={
          sessionStatus === 'loading'
            ? 'Checking your session...'
            : initialization.isInitializing
              ? 'Initializing...'
              : 'Loading...'
        }
      />
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Grid container component="main" sx={{ height: '100vh', overflow: 'hidden' }}>
        <Grid
          item
          xs={12}
          sm={6}
          component={Paper}
          elevation={6}
          square
          sx={{ height: '100vh', overflow: 'auto' }}
        >
          <Container component="main" maxWidth="sm">
            <Box sx={{ my: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Image
                src="/static/images/Pyfactor.png"
                alt="Pyfactor Logo"
                width={150}
                height={50}
                priority
              />
              <Typography variant="h6" color="primary" gutterBottom>
                {metadata.title}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {metadata.description}
              </Typography>

              <Box
                component="form"
                key={formKey}
                ref={formRef}
                onSubmit={methods.handleSubmit(onSubmit)} // Use methods.handleSubmit
                noValidate
                sx={{ mt: 3, width: '100%' }}
              >
                <Grid container spacing={2}>
                  {/* Move Reset Button to top */}
                  <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={handleFormReset}
                      disabled={isLoading || isSubmitting}
                      size="small"
                    >
                      Reset Form
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="firstName"
                      control={methods.control}
                      defaultValue=""
                      rules={{ required: 'First name is required' }}
                      render={({ field, fieldState: { error } }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="First Name"
                          error={!!getFieldError(field.name)}
                          helperText={getFieldError(field.name)}
                          disabled={isLoading}
                          onChange={(e) => {
                            field.onChange(e);
                            handleChange('firstName', e.target.value);
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="lastName"
                      control={methods.control}
                      defaultValue=""
                      rules={{ required: 'Last name is required' }}
                      render={({ field, fieldState: { error } }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Last Name"
                          error={!!getFieldError(field.name)}
                          helperText={getFieldError(field.name)}
                          disabled={isLoading}
                          onChange={(e) => {
                            field.onChange(e);
                            handleChange('lastName', e.target.value);
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="businessName"
                      control={methods.control}
                      defaultValue=""
                      rules={{ required: 'Business name is required' }}
                      render={({ field, fieldState: { error } }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="What's your business name?"
                          error={!!getFieldError(field.name)}
                          helperText={getFieldError(field.name)}
                          disabled={isLoading}
                          onChange={(e) => {
                            field.onChange(e);
                            handleChange('businessName', e.target.value);
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="industry"
                      control={methods.control}
                      defaultValue=""
                      rules={{ required: 'Industry is required' }}
                      render={({ field, fieldState: { error } }) => (
                        <FormControl fullWidth error={!!error}>
                          <InputLabel>Select your industry</InputLabel>
                          <Select
                            {...field}
                            label="Select your industry"
                            disabled={isLoading}
                            onChange={(e) => {
                              field.onChange(e);
                              handleChange('industry', e.target.value);
                            }}
                            value={field.value || ''}
                          >
                            <MenuItem value="" disabled>
                              Select an industry
                            </MenuItem>
                            {businessTypes.map((type) => (
                              <MenuItem key={type} value={type}>
                                {type}
                              </MenuItem>
                            ))}
                          </Select>
                          {error && <Typography color="error">{error.message}</Typography>}
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="country"
                      control={methods.control}
                      defaultValue=""
                      rules={{ required: 'Country is required' }}
                      render={({ field, fieldState: { error } }) => (
                        <FormControl fullWidth error={!!error}>
                          <InputLabel>Where is your business located?</InputLabel>
                          <Select
                            {...field}
                            label="Where is your business located?"
                            disabled={isLoading}
                            onChange={(e) => {
                              field.onChange(e);
                              handleChange('country', e.target.value);
                            }}
                            value={field.value || ''}
                          >
                            <MenuItem value="" disabled>
                              Select a country
                            </MenuItem>
                            {countries.map((country) => (
                              <MenuItem key={country.code} value={country.code}>
                                {country.name}
                              </MenuItem>
                            ))}
                          </Select>
                          {error && <Typography color="error">{error.message}</Typography>}
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="legalStructure"
                      control={methods.control}
                      defaultValue=""
                      rules={{ required: 'Legal structure is required' }}
                      render={({ field, fieldState: { error } }) => (
                        <FormControl fullWidth error={!!error}>
                          <InputLabel>What is the legal structure of your business?</InputLabel>
                          <Select
                            {...field}
                            label="Legal Structure"
                            disabled={isLoading}
                            onChange={(e) => {
                              field.onChange(e);
                              handleChange('legalStructure', e.target.value);
                            }}
                            value={field.value || ''}
                          >
                            <MenuItem value="" disabled>
                              Select a legal structure
                            </MenuItem>
                            {legalStructures.map((structure) => (
                              <MenuItem key={structure} value={structure}>
                                {structure}
                              </MenuItem>
                            ))}
                          </Select>
                          {error && <Typography color="error">{error.message}</Typography>}
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="dateFounded"
                      control={methods.control}
                      defaultValue=""
                      rules={{ required: 'Date founded is required' }}
                      render={({ field, fieldState: { error } }) => (
                        <TextField
                          {...field}
                          fullWidth
                          type="date"
                          label="When was your business founded?"
                          InputLabelProps={{ shrink: true }}
                          error={!!getFieldError(field.name)}
                          helperText={getFieldError(field.name)}
                          disabled={isLoading}
                          onChange={(e) => {
                            field.onChange(e);
                            handleChange('dateFounded', e.target.value);
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      fullWidth
                      disabled={isLoading || isSubmitting || methods.formState.isSubmitting}
                    >
                      {isLoading || isSubmitting || methods.formState.isSubmitting ? (
                        <CircularProgress size={24} />
                      ) : (
                        'Next'
                      )}
                    </Button>
                    {isSavingDraft && (
                      <Grid item xs={12}>
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          sx={{ mt: 1, display: 'flex', alignItems: 'center' }}
                        >
                          <CircularProgress size={12} sx={{ mr: 1 }} />
                          Saving draft...
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Container>
        </Grid>

        {/* Right side content */}
        <Grid
          item
          xs={12}
          sm={6}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#e3f2fd',
            p: 4,
            height: '100vh',
          }}
        >
          <Box sx={{ width: '100%', mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'black', mb: 2 }}>
              Boost Your Productivity
            </Typography>
            <ul style={{ listStyleType: 'none', padding: 0, color: 'black' }}>
              <li>
                ✅ <strong>Streamline your workflow</strong> with our intuitive tools.
              </li>
              <li>
                ✅ <strong>Track your progress</strong> and achieve your goals faster.
              </li>
              <li>
                ✅ <strong>Collaborate seamlessly</strong> with your team members.
              </li>
            </ul>
          </Box>
          <Box sx={{ width: '80%', height: '50%', position: 'relative' }}>
            <Image
              src="/static/images/Being-Productive-3--Streamline-Brooklyn.png"
              alt="Productive workspace"
              layout="fill"
              objectFit="contain"
              priority
            />
          </Box>
        </Grid>
      </Grid>
    </ThemeProvider>
  );
});
// 2. Initialization wrapper (Step1WithInit)
const Step1WithInit = memo(function Step1WithInit({ metadata }) {
  const {
    methods,
    loadLatestDraft,
    initialization,
    handleChange,
    formRef,
    saveDraft,
    defaultValues, // Get this from useStep1Form
    handleSubmit, // Get this from useStep1Form
  } = useStep1Form();
  const { data: session, status: sessionStatus } = useSession();
  const toast = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combined loading state
  const isLoading = sessionStatus === 'loading' || initialization.isInitializing;

  // Recovery handler with defaultValues
  const handleRecovery = useCallback(async () => {
    try {
      toast.info('Attempting to recover your data...');
      await initialization.reset();

      const draft = await loadLatestDraft();
      if (draft) {
        methods.reset(draft);
        toast.success('Successfully recovered your data');
      } else {
        methods.reset(defaultValues);
        toast.info('Starting with a new form');
      }
    } catch (error) {
      logger.error('Recovery failed:', error);
      toast.error('Unable to recover your data');
      router.replace('/onboarding/start');
    }
  }, [initialization, methods, loadLatestDraft, toast, router, defaultValues]);

  return (
    <Step1Core
      {...{
        metadata,
        methods,
        handleChange,
        formRef,
        saveDraft,
        initialization,
        isLoading,
        isSubmitting,
        setIsSubmitting,
        session,
        sessionStatus,
        toast,
        router,
        onRecovery: handleRecovery,
        handleSubmit, // Add this
        defaultValues, // Add this
      }}
    />
  );
});

// 3. Main export with error boundary
export default memo(function Step1({ metadata }) {
  return (
    <OnboardingErrorBoundary
      componentName="Step1"
      stepNumber={1}
      errorMessage="Error processing your business information"
    >
      <Step1WithInit metadata={metadata} />
    </OnboardingErrorBoundary>
  );
});

// PropTypes
if (process.env.NODE_ENV !== 'production') {
  const PropTypes = require('prop-types');

  const metadataPropType = PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    nextStep: PropTypes.string.isRequired,
    prevStep: PropTypes.string,
    isRequired: PropTypes.bool,
  }).isRequired;

  const methodsPropType = PropTypes.shape({
    trigger: PropTypes.func.isRequired,
    reset: PropTypes.func.isRequired,
    formState: PropTypes.object.isRequired,
    control: PropTypes.object.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    getValues: PropTypes.func.isRequired,
    setValue: PropTypes.func.isRequired,
  }).isRequired;

  const initializationPropType = PropTypes.shape({
    isInitializing: PropTypes.bool.isRequired,
    isInitialized: PropTypes.bool.isRequired,
    error: PropTypes.any,
    reset: PropTypes.func.isRequired,
  }).isRequired;

  Step1Core.propTypes = {
    metadata: metadataPropType,
    methods: methodsPropType,
    handleChange: PropTypes.func.isRequired,
    formRef: PropTypes.object,
    saveDraft: PropTypes.func.isRequired,
    initialization: initializationPropType, // Use the more specific type
    isLoading: PropTypes.bool.isRequired,
    isSubmitting: PropTypes.bool.isRequired,
    setIsSubmitting: PropTypes.func.isRequired,
    session: PropTypes.object,
    sessionStatus: PropTypes.string.isRequired,
    toast: PropTypes.object.isRequired,
    router: PropTypes.object.isRequired,
    onRecovery: PropTypes.func.isRequired,
    defaultValues: PropTypes.object.isRequired,
  };

  Step1WithInit.propTypes = {
    metadata: metadataPropType,
  };
}
