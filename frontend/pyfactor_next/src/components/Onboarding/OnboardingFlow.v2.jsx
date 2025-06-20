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

/**
 * Enhanced Onboarding Flow Component
 * Uses state machine for clear flow management
 */
export default function OnboardingFlowV2() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentState, setCurrentState] = useState(null);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Initialize state machine
  useEffect(() => {
    initializeOnboarding();
  }, []);

  const initializeOnboarding = async () => {
    try {
      setLoading(true);
      await onboardingStateMachine.initialize();
      
      const state = onboardingStateMachine.getCurrentState();
      setCurrentState(state);
      
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
      setFormData(progress);
      
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
      
      // Prepare data for backend
      const backendData = {
        business_name: data.businessName,
        business_type: data.businessType,
        country: data.country || 'US',
        legal_structure: data.legalStructure,
        date_founded: data.dateFounded
      };
      
      logger.info('[OnboardingFlow] Sending to backend:', backendData);
      console.log('🚨 [OnboardingFlow] Backend data:', JSON.stringify(backendData, null, 2));
      
      // Submit to backend
      const response = await apiClient.post('/api/onboarding/business-info', backendData);
      
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
      
      // Update state machine
      await onboardingStateMachine.selectSubscription(plan, billingCycle);
      
      if (plan === 'free') {
        // Complete onboarding for free plan
        await completeOnboarding(updatedData);
      } else {
        // Redirect to payment
        setCurrentState(ONBOARDING_STATES.PAYMENT_PENDING);
        router.push(`/onboarding/payment?plan=${plan}&billing=${billingCycle}`);
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
      const tenantId = response.tenantId || response.tenant_id || response.data?.tenantId || response.data?.tenant_id;
      
      if (response.success && tenantId) {
        // Session updates are handled automatically by backend in session-v2 system
        // Force session refresh to get updated data
        sessionManager.clearCache();
        
        console.log('🎯 [OnboardingFlow] Redirecting to dashboard:', `/${tenantId}/dashboard`);
        // Redirect to dashboard
        router.push(`/${tenantId}/dashboard`);
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
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => (
          <div key={step.state} className="flex-1 flex items-center">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${idx <= currentIndex ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}
            `}>
              {idx + 1}
            </div>
            {idx < steps.length - 1 && (
              <div className={`
                flex-1 h-1 mx-2
                ${idx < currentIndex ? 'bg-blue-600' : 'bg-gray-300'}
              `} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {steps.map((step) => (
          <div key={step.state} className="text-xs text-gray-600">
            {step.label}
          </div>
        ))}
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
function SubscriptionSelectionStep({ data, onSelect, submitting, error }) {
  return (
    <SubscriptionSelectionFormV2
      initialData={data}
      onSelect={onSelect}
      submitting={submitting}
      error={error}
    />
  );
}