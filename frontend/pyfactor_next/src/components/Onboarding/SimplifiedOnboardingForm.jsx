'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import LoadingSpinner from '@/components/LoadingSpinner';
import { countries } from 'countries-list';
import { businessTypes, legalStructures } from '@/app/utils/businessData';

/**
 * Simplified Onboarding Form Component
 * 
 * This replaces the multi-step onboarding process with a single form
 * that collects all necessary information and submits to the consolidated API.
 * 
 * Benefits:
 * - Single form submission (faster UX)
 * - Reduced complexity and state management
 * - Direct Auth0 session management
 * - Better error handling and recovery
 */

// Subscription plans
const PLANS = [
  {
    id: 'free',
    name: 'Basic',
    description: 'Get started with essential features',
    price: 'Free',
    features: [
      'Up to 3 projects',
      'Core analytics', 
      'Basic support',
      'Essential integrations'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Advanced features for growing businesses',
    price: '$15/month',
    features: [
      'Unlimited projects',
      'Advanced analytics',
      'Priority support',
      'All integrations',
      'Custom dashboards'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Complete solution for large organizations',
    price: '$35/month',
    features: [
      'Everything in Professional',
      'SSO integration',
      'Advanced security',
      'Dedicated support',
      'Custom features'
    ]
  }
];


export default function SimplifiedOnboardingForm() {
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    legalStructure: '',
    country: 'United States',
    dateFounded: new Date().toISOString().split('T')[0], // Default to today
    selectedPlan: 'free',
    billingCycle: 'monthly'
  });
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState('business'); // business, plan, review
  
  // Convert countries object to array for dropdown
  const countryOptions = useMemo(() => {
    return Object.entries(countries).map(([code, country]) => ({
      value: country.name,
      label: country.name,
      code: code
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, []);
  
  // Format businessTypes for dropdown
  const businessTypeOptions = useMemo(() => {
    return businessTypes.map(type => ({
      value: type,
      label: type
    }));
  }, []);
  
  // Format legalStructures for dropdown
  const legalStructureOptions = useMemo(() => {
    return legalStructures.map(structure => ({
      value: structure,
      label: structure
    }));
  }, []);
  
  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (error) setError('');
  };
  
  // Validate current step
  const validateStep = (step) => {
    const errors = [];
    
    if (step === 'business') {
      if (!formData.businessName.trim()) errors.push('Business name is required');
      if (!formData.businessType) errors.push('Business type is required');
      if (!formData.legalStructure) errors.push('Legal structure is required');
      if (!formData.country) errors.push('Country is required');
    }
    
    return errors;
  };
  
  // Navigate between steps
  const nextStep = () => {
    const errors = validateStep(currentStep);
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }
    
    if (currentStep === 'business') setCurrentStep('plan');
    else if (currentStep === 'plan') setCurrentStep('review');
  };
  
  const prevStep = () => {
    if (currentStep === 'plan') setCurrentStep('business');
    else if (currentStep === 'review') setCurrentStep('plan');
  };
  
  // Submit complete onboarding
  const submitOnboarding = async () => {
    // Final validation
    const businessErrors = validateStep('business');
    if (businessErrors.length > 0) {
      setError(businessErrors.join(', '));
      setCurrentStep('business');
      return;
    }
    
    if (!formData.selectedPlan) {
      setError('Please select a subscription plan');
      setCurrentStep('plan');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      logger.info('[SimplifiedOnboarding] Submitting complete onboarding data', {
        businessName: formData.businessName,
        businessType: formData.businessType,
        selectedPlan: formData.selectedPlan
      });
      
      const response = await fetch('/api/onboarding/complete-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        logger.info('[SimplifiedOnboarding] Onboarding completed successfully', {
          tenantId: result.tenant_id,
          redirectUrl: result.redirect_url
        });
        
        // Force a full page reload to refresh the session
        // Using window.location.href instead of router.push to ensure session is refreshed
        // Refresh the session to ensure onboarding status is updated
        setTimeout(async () => {
          try {
            console.log('[SimplifiedOnboarding] Refreshing session before redirect...');
            await fetch('/api/auth/refresh-session', { method: 'POST' });
          } catch (error) {
            console.error('[SimplifiedOnboarding] Session refresh failed:', error);
          }
          
          console.log('[SimplifiedOnboarding] Redirecting to dashboard...');
          window.location.href = result.redirect_url;
        }, 500); // 500ms delay to ensure cookie is set // 500ms delay to ensure cookie is set
      } else {
        throw new Error(result.message || 'Failed to complete onboarding');
      }
    } catch (error) {
      logger.error('[SimplifiedOnboarding] Onboarding submission failed:', error);
      setError(error.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render business information step
  const renderBusinessStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Information</h2>
        <p className="text-gray-600">Tell us about your business to get started</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Name *
          </label>
          <input
            type="text"
            value={formData.businessName}
            onChange={(e) => handleInputChange('businessName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your business name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Type *
          </label>
          <select
            value={formData.businessType}
            onChange={(e) => handleInputChange('businessType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select business type</option>
            {businessTypeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Legal Structure *
          </label>
          <select
            value={formData.legalStructure}
            onChange={(e) => handleInputChange('legalStructure', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select legal structure</option>
            {legalStructureOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Country *
          </label>
          <select
            value={formData.country}
            onChange={(e) => handleInputChange('country', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select country</option>
            {countryOptions.map(option => (
              <option key={option.code} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Founded
          </label>
          <input
            type="date"
            value={formData.dateFounded}
            onChange={(e) => handleInputChange('dateFounded', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
  
  // Render plan selection step
  const renderPlanStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
        <p className="text-gray-600">Select the plan that best fits your needs</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map(plan => (
          <div
            key={plan.id}
            onClick={() => handleInputChange('selectedPlan', plan.id)}
            className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
              formData.selectedPlan === plan.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
              <div className="text-2xl font-bold text-blue-600 mb-4">{plan.price}</div>
              <ul className="text-sm text-gray-600 space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
      
      {formData.selectedPlan !== 'free' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800">
            Note: You can start with the free plan and upgrade anytime from your dashboard.
          </p>
        </div>
      )}
    </div>
  );
  
  // Render review step
  const renderReviewStep = () => {
    const selectedPlan = PLANS.find(p => p.id === formData.selectedPlan);
    
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Confirm</h2>
          <p className="text-gray-600">Please review your information before completing setup</p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium">Business:</span> {formData.businessName}</div>
              <div><span className="font-medium">Type:</span> {formData.businessType}</div>
              <div><span className="font-medium">Legal Structure:</span> {formData.legalStructure}</div>
              <div><span className="font-medium">Country:</span> {formData.country}</div>
              <div><span className="font-medium">Founded:</span> {formData.dateFounded}</div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Selected Plan</h3>
            <div className="text-sm">
              <div><span className="font-medium">Plan:</span> {selectedPlan?.name}</div>
              <div><span className="font-medium">Price:</span> {selectedPlan?.price}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-800">
            By completing setup, you agree to our Terms of Service and Privacy Policy.
            You can modify your plan and business information anytime from your dashboard.
          </p>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {['business', 'plan', 'review'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === step
                    ? 'bg-blue-500 text-white'
                    : index < ['business', 'plan', 'review'].indexOf(currentStep)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                {index < 2 && (
                  <div className={`w-16 h-1 mx-2 ${
                    index < ['business', 'plan', 'review'].indexOf(currentStep)
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Form content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {currentStep === 'business' && renderBusinessStep()}
          {currentStep === 'plan' && renderPlanStep()}
          {currentStep === 'review' && renderReviewStep()}
          
          {/* Error message */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
          {/* Navigation buttons */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 'business' || isSubmitting}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
            
            {currentStep === 'review' ? (
              <button
                onClick={submitOnboarding}
                disabled={isSubmitting}
                className="px-8 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="small" />
                    <span className="ml-2">Completing Setup...</span>
                  </>
                ) : (
                  'Complete Setup'
                )}
              </button>
            ) : (
              <button
                onClick={nextStep}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}