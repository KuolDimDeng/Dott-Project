'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { CreditCardIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

const PaymentSettings = () => {
  const [stripeStatus, setStripeStatus] = useState({
    loading: true,
    hasAccount: false,
    onboardingComplete: false,
    chargesEnabled: false,
    payoutsEnabled: false,
    requirements: null
  });
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isCreatingOnboardingLink, setIsCreatingOnboardingLink] = useState(false);

  useEffect(() => {
    fetchStripeStatus();
    
    // Check for return parameters from Stripe onboarding
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('setup') === 'complete') {
      toast.success('Stripe Connect setup completed! Checking status...');
      setTimeout(() => fetchStripeStatus(), 2000); // Give Stripe time to update
    } else if (urlParams.get('refresh') === 'true') {
      toast.info('Please complete the Stripe Connect setup to enable payments');
    }
  }, []);

  const fetchStripeStatus = async () => {
    try {
      const response = await fetch('/api/payments/stripe-connect/account-status/', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setStripeStatus({
          loading: false,
          hasAccount: data.has_account,
          onboardingComplete: data.onboarding_complete,
          chargesEnabled: data.charges_enabled,
          payoutsEnabled: data.payouts_enabled,
          requirements: data.requirements
        });
      } else {
        throw new Error('Failed to fetch status');
      }
    } catch (error) {
      console.error('Error fetching Stripe status:', error);
      setStripeStatus(prev => ({ ...prev, loading: false }));
      toast.error('Failed to load payment settings');
    }
  };

  const createStripeAccount = async () => {
    setIsCreatingAccount(true);
    try {
      const response = await fetch('/api/payments/stripe-connect/create-account/', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Stripe Connect account created successfully!');
        await fetchStripeStatus();
        
        // Automatically start onboarding
        await createOnboardingLink();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Error creating Stripe account:', error);
      toast.error(error.message || 'Failed to create Stripe account');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const createOnboardingLink = async () => {
    setIsCreatingOnboardingLink(true);
    try {
      const response = await fetch('/api/payments/stripe-connect/onboarding-link/', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Stripe onboarding
        window.location.href = data.onboarding_url;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create onboarding link');
      }
    } catch (error) {
      console.error('Error creating onboarding link:', error);
      toast.error(error.message || 'Failed to start onboarding');
    } finally {
      setIsCreatingOnboardingLink(false);
    }
  };

  const refreshOnboarding = async () => {
    setIsCreatingOnboardingLink(true);
    try {
      const response = await fetch('/api/payments/stripe-connect/refresh-onboarding/', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.onboarding_url;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh onboarding');
      }
    } catch (error) {
      console.error('Error refreshing onboarding:', error);
      toast.error(error.message || 'Failed to refresh onboarding');
    } finally {
      setIsCreatingOnboardingLink(false);
    }
  };

  if (stripeStatus.loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <CenteredSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black mb-2 flex items-center">
          <CreditCardIcon className="h-6 w-6 text-blue-600 mr-2" />
          Payment Settings
        </h1>
        <p className="text-gray-600">
          Set up online payments to let your customers pay invoices with credit cards. 
          Dott uses Stripe Connect for secure payment processing.
        </p>
      </div>

      {/* Stripe Connect Status Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Stripe Connect Setup
            </h2>
            <p className="text-sm text-gray-600">
              Enable secure online payments for your invoices
            </p>
          </div>
          
          {stripeStatus.onboardingComplete && stripeStatus.chargesEnabled ? (
            <div className="flex items-center text-green-600">
              <CheckCircleIcon className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Active</span>
            </div>
          ) : stripeStatus.hasAccount ? (
            <div className="flex items-center text-yellow-600">
              <ExclamationTriangleIcon className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Setup Required</span>
            </div>
          ) : (
            <div className="flex items-center text-gray-400">
              <ExclamationTriangleIcon className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Not Set Up</span>
            </div>
          )}
        </div>

        {/* Status Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              stripeStatus.hasAccount ? 'bg-green-400' : 'bg-gray-300'
            }`} />
            <div>
              <p className="text-sm font-medium text-gray-900">Account Created</p>
              <p className="text-xs text-gray-500">
                {stripeStatus.hasAccount ? 'Complete' : 'Pending'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              stripeStatus.onboardingComplete ? 'bg-green-400' : 'bg-gray-300'
            }`} />
            <div>
              <p className="text-sm font-medium text-gray-900">Onboarding</p>
              <p className="text-xs text-gray-500">
                {stripeStatus.onboardingComplete ? 'Complete' : 'Pending'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              stripeStatus.chargesEnabled ? 'bg-green-400' : 'bg-gray-300'
            }`} />
            <div>
              <p className="text-sm font-medium text-gray-900">Payments</p>
              <p className="text-xs text-gray-500">
                {stripeStatus.chargesEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>

        {/* Requirements */}
        {stripeStatus.requirements && (
          stripeStatus.requirements.currently_due.length > 0 || 
          stripeStatus.requirements.eventually_due.length > 0 ||
          stripeStatus.requirements.past_due.length > 0
        ) && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">
              Action Required
            </h3>
            <p className="text-sm text-yellow-700 mb-2">
              Stripe requires additional information to complete your setup:
            </p>
            <ul className="text-sm text-yellow-700 list-disc list-inside">
              {stripeStatus.requirements.currently_due.map((req, index) => (
                <li key={index} className="capitalize">
                  {req.replace(/_/g, ' ')}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!stripeStatus.hasAccount ? (
            <button
              onClick={createStripeAccount}
              disabled={isCreatingAccount}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingAccount ? (
                <>
                  <CenteredSpinner />
                  <span className="ml-2">Creating Account...</span>
                </>
              ) : (
                'Set Up Online Payments'
              )}
            </button>
          ) : !stripeStatus.onboardingComplete || !stripeStatus.chargesEnabled ? (
            <button
              onClick={stripeStatus.onboardingComplete ? refreshOnboarding : createOnboardingLink}
              disabled={isCreatingOnboardingLink}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingOnboardingLink ? (
                <>
                  <CenteredSpinner />
                  <span className="ml-2">Loading...</span>
                </>
              ) : (
                'Complete Setup'
              )}
            </button>
          ) : (
            <div className="flex items-center text-green-600">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">
                Online payments are active! Your customers can now pay invoices online.
              </span>
            </div>
          )}
          
          {stripeStatus.hasAccount && (
            <button
              onClick={fetchStripeStatus}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Refresh Status
            </button>
          )}
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          How Online Payments Work
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">For You</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Get paid faster with credit card payments</li>
              <li>• Automatic payment confirmations</li>
              <li>• Secure payment processing by Stripe</li>
              <li>• Platform fee: 2.5% + $0.30 per transaction</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">For Your Customers</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Pay with any major credit or debit card</li>
              <li>• Secure checkout process</li>
              <li>• Instant payment confirmations</li>
              <li>• No account registration required</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSettings;