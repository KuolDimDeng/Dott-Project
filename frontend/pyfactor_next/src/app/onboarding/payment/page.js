// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/payment/page.js
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { Payment } from '../components/steps';
import OnboardingLayout from '../layout';
import { STEP_METADATA, STEP_NAMES } from '../components/registry';
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { logger } from '@/utils/logger';
import { Typography, Box, CircularProgress, Container, Paper, Alert, Button } from '@mui/material';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useEnhancedOnboarding } from '@/hooks/useEnhancedOnboarding';

const PaymentFallback = () => (
  <div className="flex justify-center items-center min-h-screen">
    <LoadingSpinner size="large" />
  </div>
);

const PaymentContent = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { updateOnboardingStatus } = useOnboarding();
  const { verifyState, updateState, isLoading: isStateLoading, error: stateError } = useEnhancedOnboarding();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [subscriptionData, setSubscriptionData] = useState(null);

  useEffect(() => {
    async function initPage() {
      try {
        // Verify the current state with the enhanced hook
        const stateVerification = await verifyState('payment');
        
        if (!stateVerification.isValid) {
          logger.warn('[Payment] Invalid state, redirecting to:', stateVerification.redirectUrl);
          router.replace(stateVerification.redirectUrl);
          return;
        }
        
        logger.debug('[Payment] State verification successful');
        
        // Set the current step to 'payment' when the page loads
        try {
          await updateState('payment', {});
          logger.debug('[Payment] Step updated to payment using enhanced hook');
        } catch (updateErr) {
          logger.error('[Payment] Error updating state:', updateErr);
        }
      } catch (err) {
        logger.error('[Payment] Error verifying state:', err);
      }
    }
    
    initPage();
  }, [verifyState, updateState, router]);

  // Special check for free plan cookie - redirect immediately to dashboard
  useEffect(() => {
    // Check if this is a free plan that shouldn't be on the payment page
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        try {
          acc[key] = decodeURIComponent(value);
        } catch (e) {
          acc[key] = value;
        }
      }
      return acc;
    }, {});
    
    // Check for free plan indicators
    if (cookies.selectedPlan === 'free' || cookies.freePlanSelected === 'true') {
      logger.warn('[Payment] Free plan detected but on payment page - redirecting to dashboard');
      
      // Force dashboard redirect
      window.location.replace(`/dashboard?freePlan=true&t=${new Date().getTime()}`);
      return;
    }
  }, []);

  useEffect(() => {
    async function loadPaymentInfo() {
      try {
        // First check if free plan cookie exists - redirect if it does
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          if (key && value) {
            try {
              acc[key] = decodeURIComponent(value);
            } catch (e) {
              acc[key] = value;
            }
          }
          return acc;
        }, {});
        
        // Check again for free plan indicators
        if (cookies.selectedPlan === 'free' || cookies.freePlanSelected === 'true') {
          logger.warn('[Payment] Free plan detected in cookie - redirecting to dashboard');
          window.location.replace(`/dashboard?freePlan=true&t=${new Date().getTime()}`);
          return;
        }
        
        const pendingSubscription = sessionStorage.getItem('pendingSubscription');
        const subscriptionData = pendingSubscription ? JSON.parse(pendingSubscription) : null;
        
        logger.debug('[Payment] Loading payment page with subscription data:', {
          pendingSubscription: subscriptionData,
          cookies: document.cookie
        });
        
        // Store subscription data in state
        setSubscriptionData(subscriptionData);
        
        // Debug information for troubleshooting
        setDebugInfo({
          plan: subscriptionData?.plan || 'unknown',
          planLowerCase: subscriptionData?.plan?.toLowerCase() || 'none',
          isProfessionalOrEnterprise: ['professional', 'enterprise'].includes(subscriptionData?.plan?.toLowerCase()),
          paymentMethod: subscriptionData?.payment_method,
          cookies: document.cookie,
          // Add cookie parsing for more visibility
          parsedCookies: cookies
        });

        // Check if subscription data exists and is valid
        if (!subscriptionData) {
          logger.error('[Payment] No subscription data found');
          
          // Last-ditch attempt - check cookies for selectedPlan
          if (cookies.selectedPlan === 'free') {
            logger.warn('[Payment] Free plan found in cookies - redirecting to dashboard');
            window.location.replace(`/dashboard?freePlan=true&t=${new Date().getTime()}`);
            return;
          }
          
          setError('No subscription data found. Please select a plan first.');
          setLoading(false);
          return;
        }
        
        // Extra safety check - if the plan is 'free', redirect to dashboard
        if (subscriptionData.plan?.toLowerCase() === 'free' || 
            subscriptionData.id?.toLowerCase() === 'free') {
          logger.warn('[Payment] Free plan detected in subscription data - redirecting to dashboard');
          window.location.replace(`/dashboard?freePlan=true&t=${new Date().getTime()}`);
          return;
        }
        
        // Normalize plan name for case-insensitive comparison
        const planLowerCase = subscriptionData.plan?.toLowerCase();
        logger.debug('[Payment] Subscription plan validation:', {
          plan: subscriptionData.plan,
          planLowerCase,
          isProfessionalOrEnterprise: ['professional', 'enterprise'].includes(planLowerCase),
          fullData: subscriptionData
        });
        
        // Check if plan requires payment with enhanced logging
        const isProfessionalOrEnterprise = ['professional', 'enterprise'].includes(planLowerCase);
        logger.debug('[Payment] Validating plan payment requirements:', {
          planValidation: {
            planRaw: subscriptionData.plan,
            planLowerCase,
            isProfessionalOrEnterprise,
            includesCheck: ['professional', 'enterprise'].includes(planLowerCase),
            exactMatches: {
              matchesProfessional: planLowerCase === 'professional',
              matchesEnterprise: planLowerCase === 'enterprise',
            }
          },
          stringComparison: {
            strictEquals: {
              professional: planLowerCase === 'professional',
              enterprise: planLowerCase === 'enterprise',
            },
            includes: {
              professional: planLowerCase.includes('professional'),
              enterprise: planLowerCase.includes('enterprise'),
            },
            typeOfPlan: typeof subscriptionData.plan,
            typeOfPlanLowerCase: typeof planLowerCase,
          },
          fullSubscriptionData: subscriptionData,
          subscriptionDataProperties: Object.keys(subscriptionData)
        });
        
        if (!isProfessionalOrEnterprise) {
          logger.error('[Payment] Payment is only required for Professional and Enterprise tiers', {
            plan: subscriptionData.plan,
            planLowerCase,
            fullSubscriptionData: subscriptionData,
            sessionStorageOriginal: sessionStorage.getItem('pendingSubscription')
          });
          setError('Payment is only required for Professional and Enterprise tiers');
          setLoading(false);
          return;
        }
        
        // At this point, we have valid subscription data for a paid plan
        logger.debug('[Payment] Valid paid plan selected:', {
          plan: subscriptionData.plan,
          paymentMethod: subscriptionData.payment_method
        });
        
        // Ready to show payment form
        setLoading(false);
      } catch (e) {
        logger.error('[Payment] Error loading payment info:', { error: e.message });
        setError('An error occurred while loading payment information');
        setLoading(false);
      }
    }

    loadPaymentInfo();
  }, []);

  React.useEffect(() => {
    const logPageView = () => {
      logger.debug('Payment page mounted:', {
        sessionStatus: status,
        hasUser: !!session?.user,
        timestamp: new Date().toISOString(),
      });
    };

    logPageView();
  }, [session, status]);

  // Separate useEffect for handling authentication-based navigation
  React.useEffect(() => {
    if (status === 'unauthenticated') {
      logger.warn('Unauthenticated access to payment page');
      router.replace('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading' || isStateLoading) {
    return <PaymentFallback />;
  }

  if (status === 'unauthenticated') {
    return <PaymentFallback />;
  }
  
  // Show loading state
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h5" gutterBottom>Loading Payment Information</Typography>
          <CircularProgress sx={{ my: 4 }} />
          <Typography variant="body2" color="text.secondary">
            Please wait while we prepare your payment information...
          </Typography>
        </Paper>
      </Container>
    );
  }
  
  // Show error state
  if (error || stateError) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" color="error" gutterBottom>Payment Error</Typography>
          <Alert severity="error" sx={{ my: 2 }}>{error || stateError}</Alert>
          
          {/* Debug information */}
          <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>Debug Information:</Typography>
            <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
              {JSON.stringify(debugInfo, null, 2)}
            </Typography>
          </Box>
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => router.push('/onboarding/subscription')}
            sx={{ mt: 2 }}
          >
            Return to Subscription Page
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <ErrorBoundary
      fallback={(error) => (
        <div className="p-4">
          <h2 className="text-xl font-bold text-red-600">
            Error Loading Payment
          </h2>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={() => router.refresh()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      )}
    >
      <Payment metadata={STEP_METADATA[STEP_NAMES.PAYMENT]} />
    </ErrorBoundary>
  );
};

const PaymentPage = () => {
  return (
    <OnboardingLayout>
      <Suspense fallback={<PaymentFallback />}>
        <PaymentContent />
      </Suspense>
    </OnboardingLayout>
  );
};

// PropTypes are not needed for Pages in Next.js 13+

export default PaymentPage;
