///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/BusinessInfo/BusinessInfo.js
'use client';

import { useRouter, usePathname } from 'next/navigation';
import React, { useEffect, useState, useCallback, useRef } from 'react';

import { useSession } from 'next-auth/react';
import PropTypes from 'prop-types';
import {
  Container,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Box,
} from '@mui/material';
import Image from 'next/image';

import { StepHeader } from '@/app/onboarding/components/shared/StepHeader';
import { StepNavigation } from '@/app/onboarding/components/shared/StepNavigation';
import { StepProgress } from '@/app/onboarding/components/shared/StepProgress';
import { useBusinessInfoForm } from './useBusinessInfoForm';
import { FormContainer } from './BusinessInfo.styles';
import { businessTypes, legalStructures } from '@/app/utils/businessData';
import { countries } from '@/app/countryList/page';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';
import { useOnboarding } from '@/app/onboarding/contexts/OnboardingContext';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { persistenceService, STORAGE_KEYS } from '@/services/persistenceService';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const getDefaultDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const defaultMetadata = {
  title: 'Business Information',
  description: 'Tell us about your business to get started',
  next_step: 'subscription',
  prevStep: null,
  current_step: 'business-info'
};

const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4">
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
      <h2 className="text-red-800 font-semibold mb-2">Something went wrong</h2>
      <p className="text-red-600 mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
      >
        Try Again
      </button>
    </div>
  </div>
);

const BusinessInfo = ({ metadata = defaultMetadata }) => {
  const { data: session, status } = useSession();
  const { isLoading: contextLoading, isInitialized: contextInitialized } = useOnboarding();
  const router = useRouter();
  const toast = useToast();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isReady, setIsReady] = useState(false);  // Add this
  const requestId = useRef(crypto.randomUUID()).current;




  const {
    methods,
    handleSubmit,
    isLoading: formIsLoading,
    isTransitioning,
  } = useBusinessInfoForm();

  const steps = [
    { 
      id: 'business-info',
      label: 'Business Info', 
      current: true, 
      completed: false 
    },
    { 
      id: 'subscription',
      label: 'Subscription', 
      current: false, 
      completed: false 
    },
    { 
      id: 'setup',
      label: 'Setup', 
      current: false, 
      completed: false 
    }
  ];


  useEffect(() => {
    logger.debug('BusinessInfo component state:', {
      requestId,
      sessionStatus: status,
      isReady,
      isInitialized,
      isValid: methods?.formState?.isValid,  // Add optional chaining
      formState: methods?.formState
    });
  }, [status, isReady, isInitialized, methods?.formState, requestId]);


    // Modify initialization effect
    useEffect(() => {
      const initializeComponent = async () => {
        if (!status || status === 'loading') {
          return;
        }
    
        try {
          if (status === 'authenticated') {
            // Don't check isInitialized here
            setIsInitialized(true);
            setIsReady(true);
            
            logger.debug('Component initialized:', {
              requestId,
              status,
              isInitialized: true,
              isReady: true
            });
          }
        } catch (err) {
          logger.error('Component initialization failed:', {
            requestId,
            error: err.message
          });
          toast.error('Failed to initialize form. Please try refreshing the page.');
        }
      };
    
      initializeComponent();
    }, [status, requestId, toast]);

// Consolidate loading states
const isLoading = status === 'loading' || 
                 (!isReady && !contextInitialized) || 
                 formIsLoading;

// Fix the spacing and add as separate effect
useEffect(() => {
  logger.debug('Loading state updated:', {
    requestId,
    status,
    isReady,
    contextInitialized,
    formIsLoading,
    isLoading
  });
}, [status, isReady, contextInitialized, formIsLoading, isLoading, requestId]);

  useEffect(() => {
    const checkSession = async () => {
      if (status === 'unauthenticated' || !session?.user?.accessToken) {
        logger.debug('Redirecting to signin - no valid session', { requestId });
        router.replace('/auth/signin');
      }
    };
    
    checkSession();
  }, [session, status, router, requestId]);


  if (isLoading) {
    return (
      <Container maxWidth="md">
        <LoadingStateWithProgress
          message="Setting up your business profile..."
          isLoading={true}
          image={{
            src: '/static/images/Pyfactor.png',
            alt: 'Pyfactor Logo',
            width: 150,
            height: 100,
          }}
        />
      </Container>
    );
  }

  const renderTextField = (name, label, options = {}) => (
    <TextField
      fullWidth
      label={label}
      {...methods.register(name)}
      error={!!methods.formState.errors[name]}
      helperText={methods.formState.errors[name]?.message}
      disabled={isLoading}
      {...options}
    />
  );

  return (
    <Container maxWidth="md">
       <ErrorBoundary 
            FallbackComponent={ErrorFallback}
        >
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
          <Image
            src="/static/images/Pyfactor.png"
            alt="Pyfactor Logo"
            width={150}
            height={120}
            priority
          />
        </Box>
        <StepProgress 
         steps={steps}
         current_step="business-info"
       />
        <StepHeader
          title={metadata.title}
          description={metadata.description}
        />
        <FormContainer>
          <form onSubmit={e => e.preventDefault()} noValidate>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                {renderTextField('business_name', 'Business Name')}
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth error={!!methods.formState.errors.business_type}>
                  <InputLabel id="business-type-label">Business Type</InputLabel>
                  <Select
                    labelId="business-type-label"
                    label="Business Type"
                    {...methods.register('business_type')}
                  >
                    {businessTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {methods.formState.errors.business_type?.message}
                  </FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth error={!!methods.formState.errors.country}>
                  <InputLabel id="country-label">Country</InputLabel>
                  <Select
                    labelId="country-label"
                    label="Country"
                    {...methods.register('country')}
                  >
                    {countries.map((country) => (
                      <MenuItem key={country.code} value={country.code}>
                        {country.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {methods.formState.errors.country?.message}
                  </FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth error={!!methods.formState.errors.legal_structure}>
                  <InputLabel id="legal-structure-label">Legal Structure</InputLabel>
                  <Select
                    labelId="legal-structure-label"
                    label="Legal Structure"
                    {...methods.register('legal_structure')}
                  >
                    {legalStructures.map((structure) => (
                      <MenuItem key={structure} value={structure}>
                        {structure}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {methods.formState.errors.legal_structure?.message}
                  </FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                {renderTextField('date_founded', 'Date Founded', {
                  type: 'date',
                  defaultValue: getDefaultDate(),
                  InputLabelProps: { shrink: true },
                  inputProps: {
                    max: getDefaultDate(),
                  }
                })}
              </Grid>
              <Grid item xs={6}>
                {renderTextField('first_name', 'First Name')}
              </Grid>
              <Grid item xs={6}>
                {renderTextField('last_name', 'Last Name')}
              </Grid>
            </Grid>
            <StepNavigation
                onNext={handleSubmit}
                loading={isTransitioning || formIsLoading}
                disableNext={!isReady || !methods.formState.isValid || isLoading}
                current_step="business-info"
                next_step="subscription"
                session={session}
                showSkip={false}
                // Add transition class for smooth animation
                className="transition-all duration-300 ease-in-out"
            />
          </form>
        </FormContainer>
      </ErrorBoundary>
    </Container>
  );
};

BusinessInfo.propTypes = {
  metadata: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  })
};

export { BusinessInfo };
export default BusinessInfo;