'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { sessionManagerEnhanced as sessionManager } from '@/utils/sessionManager-v2-enhanced';
import { onboardingStateMachine, ONBOARDING_STATES } from '@/utils/onboardingStateMachine';
import { apiClient } from '@/utils/apiClient.v2';
import { errorHandler } from '@/utils/errorHandler.v2';
import LoadingSpinner from '@/components/LoadingSpinner';
import BusinessInfoFormV2 from './BusinessInfoForm.v2';
import SubscriptionSelectionFormV2 from './SubscriptionSelectionForm.v2';
import { captureEvent } from '@/lib/posthog';
import { usePostHog } from 'posthog-js/react';
import { trackEvent, EVENTS } from '@/utils/posthogTracking';

/**
 * Enhanced Onboarding Flow Component
 * Uses state machine for clear flow management
 */
export default function OnboardingFlowV2({ initialStep, initialCountry }) {
  const router = useRouter();
  const posthog = usePostHog();
  const [loading, setLoading] = useState(true);
  const [currentState, setCurrentState] = useState(null);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Initialize state machine
  useEffect(() => {
    initializeOnboarding();
  }, [initialStep, initialCountry]);

  const initializeOnboarding = async () => {
    try {
      setLoading(true);
      await onboardingStateMachine.initialize();
      
      const state = onboardingStateMachine.getCurrentState();
      setCurrentState(state);
      
      // Track onboarding state
      captureEvent('onboarding_flow_initialized', {
        state: state,
        has_saved_progress: !!formData
      });
      
      // Redirect if already completed
      if (state === ONBOARDING_STATES.COMPLETED) {
        const session = await sessionManager.getSession();
        const tenantId = await sessionManager.getTenantId();
        
        if (tenantId) {
          router.push(`/${tenantId}/dashboard`);
        } else {
          // Data inconsistency - restart onboarding
          await onboardingStateMachine.reset();
          setCurrentState(ONBOARDING_STATES.NOT_STARTED);
        }
      }
      
      // Load saved progress
      const progress = await sessionManager.getOnboardingProgress();
      
      // Override with URL parameters if provided
      const updatedProgress = {
        ...progress,
        ...(initialCountry && { country: initialCountry })
      };
      
      setFormData(updatedProgress);
      
      // Handle initial step request
      if (initialStep === 'subscription' && state === ONBOARDING_STATES.BUSINESS_INFO && progress?.businessName) {
        // User has completed business info and wants to go to subscription
        logger.info('[OnboardingFlow] Navigating to subscription step from URL');
        await onboardingStateMachine.transitionTo(ONBOARDING_STATES.SUBSCRIPTION_SELECTION);
        setCurrentState(ONBOARDING_STATES.SUBSCRIPTION_SELECTION);
      }
      
    } catch (err) {
      logger.error('[OnboardingFlow] Initialization error', err);
      const errorInfo = errorHandler.toComponentProps(err, { context: 'onboarding_init' });
      setError(errorInfo);
    } finally {
      setLoading(false);
    }
  };

  // Handle business info submission
  const handleBusinessInfo = async (data) => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Debug: Log received data
      logger.info('[OnboardingFlow] Received data from BusinessInfoForm:', data);
      console.log('🚨 [OnboardingFlow] Raw data from form:', JSON.stringify(data, null, 2));
      
      // Update form data
      const updatedData = { ...formData, ...data };
      setFormData(updatedData);
      
      // Prepare data for backend (including currency)
      const backendData = {
        business_name: data.businessName,
        business_type: data.businessType,
        country: data.country || 'US',
        currency: data.currency || 'USD',  // Include currency
        legal_structure: data.legalStructure,
        date_founded: data.dateFounded
      };
      
      logger.info('[OnboardingFlow] Sending to backend:', backendData);
      console.log('🚨 [OnboardingFlow] Backend data:', JSON.stringify(backendData, null, 2));
      
      // Submit to backend
      const response = await apiClient.post('/api/onboarding/business-info', backendData);
      
      // Track business info submission
      captureEvent('onboarding_business_info_submitted', {
        business_type: data.businessType,
        country: data.country,
        legal_structure: data.legalStructure,
        has_tenant_id: !!response.tenant_id
      });
      
      // Track onboarding step completed
      trackEvent(posthog, EVENTS.ONBOARDING_STEP_COMPLETED, {
        step: 'business_info',
        businessName: data.businessName,
        businessType: data.businessType,
        country: data.country,
        legalStructure: data.legalStructure
      });
      
      // Update state machine
      await onboardingStateMachine.submitBusinessInfo(data);
      
      // Session updates are handled automatically by backend in session-v2 system
      if (response.tenant_id) {
        // Force session refresh to get updated data
        sessionManager.clearCache();
      }
      
      setCurrentState(ONBOARDING_STATES.SUBSCRIPTION_SELECTION);
      
    } catch (err) {
      logger.error('[OnboardingFlow] Business info error', err);
      const errorInfo = errorHandler.toComponentProps(err, { context: 'business_info' });
      setError(errorInfo);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle subscription selection
  const handleSubscriptionSelection = async (plan, billingCycle) => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Update form data
      const updatedData = { 
        ...formData, 
        selectedPlan: plan,
        billingCycle: billingCycle 
      };
      setFormData(updatedData);
      
      // Submit to backend
      await apiClient.post('/api/onboarding/subscription', {
        selected_plan: plan,
        billing_cycle: billingCycle
      });
      
      // Track subscription selection
      captureEvent('onboarding_subscription_selected', {
        plan: plan,
        billing_cycle: billingCycle,
        is_free_plan: plan === 'free'
      });
      
      // Track subscription plan selected event
      trackEvent(posthog, EVENTS.SUBSCRIPTION_SELECTED, {
        plan: plan,
        billingCycle: billingCycle,
        isFreePlan: plan === 'free'
      });
      
      // Track onboarding step completed
      trackEvent(posthog, EVENTS.ONBOARDING_STEP_COMPLETED, {
        step: 'subscription_selection',
        plan: plan,
        billingCycle: billingCycle
      });
      
      // Update state machine
      await onboardingStateMachine.selectSubscription(plan, billingCycle);
      
      if (plan === 'free') {
        // Complete onboarding for free plan
        await completeOnboarding(updatedData);
      } else {
        // Redirect to payment with country information
        setCurrentState(ONBOARDING_STATES.PAYMENT_PENDING);
        const country = formData.country || 'US';
        router.push(`/onboarding/payment?plan=${plan}&billing=${billingCycle}&country=${encodeURIComponent(country)}`);
      }
      
    } catch (err) {
      logger.error('[OnboardingFlow] Subscription selection error', err);
      const errorInfo = errorHandler.toComponentProps(err, { context: 'subscription' });
      setError(errorInfo);
    } finally {
      setSubmitting(false);
    }
  };

  // Complete onboarding (for free plan)
  const completeOnboarding = async (data) => {
    try {
      logger.info('[OnboardingFlow] Completing onboarding with data:', {
        businessName: data.businessName,
        businessType: data.businessType,
        selectedPlan: data.selectedPlan,
        country: data.country,
        legalStructure: data.legalStructure,
        dateFounded: data.dateFounded
      });
      
      const response = await apiClient.completeOnboarding({
        businessName: data.businessName,
        businessType: data.businessType,
        selectedPlan: data.selectedPlan,
        billingCycle: data.billingCycle || 'monthly',
        country: data.country || 'US',
        legalStructure: data.legalStructure || '',
        dateFounded: data.dateFounded || ''
      });
      
      logger.info('[OnboardingFlow] Complete onboarding response:', response);
      console.log('🎯 [OnboardingFlow] Response tenantId:', response.tenantId);
      console.log('🎯 [OnboardingFlow] Response tenant_id:', response.tenant_id);
      
      // Check for tenant ID in multiple locations
      let tenantId = response.tenantId || response.tenant_id || response.data?.tenantId || response.data?.tenant_id;
      
      // If still no tenant ID, check schema name
      if (!tenantId && response.data?.schemaSetup?.schema_name) {
        const schemaName = response.data.schemaSetup.schema_name;
        console.log('[OnboardingFlow] Extracting tenant ID from schema name:', schemaName);
        // Match the full UUID pattern with underscores
        const schemaMatch = schemaName.match(/tenant_([a-f0-9]{8}_[a-f0-9]{4}_[a-f0-9]{4}_[a-f0-9]{4}_[a-f0-9]{12})/);
        if (schemaMatch) {
          // Convert underscores back to hyphens for the tenant ID
          tenantId = schemaMatch[1].replace(/_/g, '-');
          console.log('[OnboardingFlow] Extracted full tenant ID from schema:', tenantId);
        }
      }
      
      if (response.success && tenantId) {
        // Track onboarding completion
        captureEvent('onboarding_completed', {
          plan: data.selectedPlan,
          billing_cycle: data.billingCycle,
          business_type: data.businessType,
          country: data.country,
          tenant_id: tenantId
        });
        
        // Track onboarding completed event
        trackEvent(posthog, EVENTS.ONBOARDING_COMPLETED, {
          plan: data.selectedPlan,
          billingCycle: data.billingCycle,
          businessType: data.businessType,
          businessName: data.businessName,
          country: data.country,
          legalStructure: data.legalStructure,
          tenantId: tenantId
        });
        
        // Session updates are handled automatically by backend in session-v2 system
        // Force session refresh to get updated data
        sessionManager.clearCache();
        
        console.log('🎯 [OnboardingFlow] Onboarding completed successfully');
        
        // CRITICAL FIX: Ensure onboarding completion is properly saved for Google OAuth users
        console.log('🔥 [OnboardingFlow] Ensuring onboarding completion is saved...');
        
        // Multiple attempts to ensure backend properly saves the status
        const backendUpdates = [];
        
        // 1. Use ensure-complete endpoint
        backendUpdates.push(
          fetch('/api/onboarding/ensure-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              tenantId: tenantId,
              businessName: data.businessName,
              selectedPlan: data.selectedPlan
            })
          })
        );
        
        // 2. Force backend onboarding status update
        const cookieStore = document.cookie;
        const sessionToken = cookieStore.match(/(?:^|; )sid=([^;]*)/)?.[1] || 
                           cookieStore.match(/(?:^|; )session_token=([^;]*)/)?.[1];
        
        if (sessionToken) {
          const API_URL = 'https://api.dottapps.com';
          
          // Update onboarding progress directly
          backendUpdates.push(
            fetch(`${API_URL}/api/onboarding/progress/update/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Session ${sessionToken}`
              },
              body: JSON.stringify({
                setup_completed: true,
                needs_onboarding: false,
                tenant_id: tenantId
              })
            })
          );
          
          // Force session refresh
          backendUpdates.push(
            fetch(`${API_URL}/api/sessions/refresh/`, {
              method: 'POST',
              headers: {
                'Authorization': `Session ${sessionToken}`
              }
            })
          );
        }
        
        // Execute all updates
        try {
          const results = await Promise.allSettled(backendUpdates);
          results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.ok) {
              console.log(`✅ [OnboardingFlow] Backend update ${index + 1} succeeded`);
            } else {
              console.error(`❌ [OnboardingFlow] Backend update ${index + 1} failed`);
            }
          });
        } catch (ensureError) {
          console.error('❌ [OnboardingFlow] Error ensuring completion:', ensureError);
          // Don't fail the whole process
        }
        
        // CRITICAL: Verify session is properly established before redirecting
        console.log('🔍 [OnboardingFlow] Verifying session before redirect...');
        
        // Wait a moment for cookies to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const verifyResponse = await fetch('/api/auth/session-verify', {
            credentials: 'include',
            cache: 'no-store'
          });
          
          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            console.log('✅ [OnboardingFlow] Session verified:', verifyData);
            
            if (!verifyData.valid) {
              console.error('❌ [OnboardingFlow] Session invalid after completion:', verifyData.reason);
              throw new Error('Session not properly established');
            }
          } else {
            console.error('❌ [OnboardingFlow] Session verification failed');
          }
        } catch (verifyError) {
          console.error('❌ [OnboardingFlow] Session verification error:', verifyError);
          // Continue anyway as the redirect might still work
        }
        
        console.log('🎯 [OnboardingFlow] Using window.location for redirect to ensure cookies are preserved');
        
        // Use window.location.href instead of router.push to ensure cookies are properly set
        // This forces a full page navigation which allows the cookies to be properly established
        window.location.href = `/${tenantId}/dashboard`;
        
        // Don't use router.push here as it may not properly handle the cookie setup
        return;
      } else if (response.redirect_url && response.redirect_url.includes('session_lost')) {
        // Handle session lost error
        logger.error('[OnboardingFlow] Session lost during onboarding');
        window.location.href = response.redirect_url;
        return;
      } else if (response.requiresAuth) {
        logger.error('[OnboardingFlow] Session lost during onboarding:', response);
        // Session was lost, redirect to login
        window.location.href = '/auth/signin?message=session_expired&returnTo=/onboarding';
        return;
      } else if (response.success && response.redirectUrl) {
        // Handle successful completion even without tenant ID (backend may create it later)
        logger.warn('[OnboardingFlow] Onboarding completed but no tenant ID yet, redirecting to:', response.redirectUrl);
        window.location.href = response.redirectUrl;
        return;
      } else if (response.success && !tenantId) {
        // Success but no tenant ID yet - wait for backend to create it
        logger.warn('[OnboardingFlow] Onboarding completed but tenant ID not immediately available, redirecting to dashboard');
        
        // Clear session cache to force refresh
        sessionManager.clearCache();
        
        // Redirect to dashboard which will handle the tenant ID resolution
        window.location.href = '/dashboard';
        return;
      } else {
        logger.error('[OnboardingFlow] Missing tenant ID in response:', response);
        throw new Error('Unable to complete onboarding: missing tenant ID');
      }
      
    } catch (err) {
      logger.error('[OnboardingFlow] Completion error', err);
      throw err;
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" text="Loading onboarding..." />
      </div>
    );
  }

  // Render error state
  if (error && !currentState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">{error.title}</h2>
          <p className="text-gray-600 mb-6">{error.description}</p>
          <div className="space-y-2">
            {error.suggestions?.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => window.location.reload()}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
          {error.reference && (
            <p className="text-xs text-gray-500 mt-4">
              Reference: {error.reference}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Render based on current state
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4">
        {/* Progress indicator */}
        <OnboardingProgress currentState={currentState} />
        
        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error.title}: {error.description}</p>
          </div>
        )}
        
        {/* Render appropriate step */}
        {(currentState === ONBOARDING_STATES.NOT_STARTED || 
          currentState === ONBOARDING_STATES.BUSINESS_INFO) && (
          <BusinessInfoStep
            data={formData}
            onSubmit={handleBusinessInfo}
            submitting={submitting}
            error={error}
          />
        )}
        
        {currentState === ONBOARDING_STATES.SUBSCRIPTION_SELECTION && (
          <SubscriptionSelectionStep
            data={formData}
            onSelect={handleSubscriptionSelection}
            onBack={() => {
              // Go back to business info step
              setCurrentState(ONBOARDING_STATES.BUSINESS_INFO);
              onboardingStateMachine.transitionTo(ONBOARDING_STATES.BUSINESS_INFO);
            }}
            submitting={submitting}
            error={error}
          />
        )}
        
        {currentState === ONBOARDING_STATES.PAYMENT_PENDING && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Payment Required</h2>
            <p className="text-gray-600 mb-6">
              You'll be redirected to complete payment for your {formData.selectedPlan} plan.
            </p>
            <LoadingSpinner text="Redirecting to payment..." />
          </div>
        )}
      </div>
    </div>
  );
}

// Progress indicator component
function OnboardingProgress({ currentState }) {
  const steps = [
    { state: ONBOARDING_STATES.BUSINESS_INFO, label: 'Business Info' },
    { state: ONBOARDING_STATES.SUBSCRIPTION_SELECTION, label: 'Choose Plan' },
    { state: ONBOARDING_STATES.PAYMENT_PENDING, label: 'Payment' },
    { state: ONBOARDING_STATES.COMPLETED, label: 'Complete' }
  ];
  
  const currentIndex = steps.findIndex(s => s.state === currentState);
  
  return (
    <div className="mb-12">
      <div className="relative">
        {/* Step circles and connecting lines */}
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => (
            <div key={step.state} className="flex-1 flex items-center">
              <div className="relative flex flex-col items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center z-10
                  ${idx <= currentIndex ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}
                `}>
                  {idx + 1}
                </div>
                <div className="mt-2 text-xs text-gray-600 whitespace-nowrap text-center">
                  {step.label}
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className={`
                  flex-1 h-1 -mt-6
                  ${idx < currentIndex ? 'bg-blue-600' : 'bg-gray-300'}
                `} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Business info step component
function BusinessInfoStep({ data, onSubmit, submitting, error }) {
  return (
    <BusinessInfoFormV2
      initialData={data}
      onSubmit={onSubmit}
      submitting={submitting}
      error={error}
    />
  );
}

// Subscription selection step component
function SubscriptionSelectionStep({ data, onSelect, onBack, submitting, error }) {
  return (
    <SubscriptionSelectionFormV2
      initialData={data}
      onSelect={onSelect}
      onBack={onBack}
      submitting={submitting}
      error={error}
    />
  );
}