'use client';

import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';
import { loadStripe } from '@stripe/stripe-js';
import { CenteredSpinner, ButtonSpinner } from '@/components/ui/StandardSpinner';
import { BanknotesIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const PayrollFundingSetup = ({ onComplete, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [fundingStatus, setFundingStatus] = useState(null);
  const [setupError, setSetupError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    checkFundingStatus();
  }, []);

  const checkFundingStatus = async () => {
    try {
      setCheckingStatus(true);
      const response = await axiosInstance.get('/api/payroll/funding-status/');
      setFundingStatus(response.data);
      
      if (response.data.has_funding_setup) {
        // Already set up, call onComplete
        onComplete && onComplete(response.data);
      }
    } catch (error) {
      console.error('Error checking funding status:', error);
      setSetupError('Unable to check funding status');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSetupFunding = async () => {
    try {
      setLoading(true);
      setSetupError(null);
      
      // Create SetupIntent for ACH authorization
      const response = await axiosInstance.post('/api/payroll/setup-funding/');
      
      if (!response.data.client_secret) {
        throw new Error('Failed to create setup intent');
      }
      
      // Load Stripe
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      
      // Collect bank account details
      const { error } = await stripe.collectBankAccountForSetup({
        clientSecret: response.data.client_secret,
        params: {
          payment_method_type: 'us_bank_account',
          payment_method_data: {
            billing_details: {
              name: fundingStatus?.business_name || 'Business',
              email: fundingStatus?.email || '',
            },
          },
        },
        expand: ['payment_method'],
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Confirm the setup was successful
      const confirmResponse = await axiosInstance.post('/api/payroll/confirm-funding/', {
        setup_intent_id: response.data.setup_intent_id,
      });
      
      if (confirmResponse.data.success) {
        toast.showSuccess('Bank account connected successfully!');
        onComplete && onComplete(confirmResponse.data);
      }
      
    } catch (error) {
      console.error('Error setting up funding:', error);
      setSetupError(error.message || 'Failed to connect bank account');
      toast.showError(error.message || 'Failed to connect bank account');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return <CenteredSpinner />;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-6">
          <BanknotesIcon className="h-8 w-8 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold">Set Up Payroll Funding</h2>
        </div>

        {fundingStatus?.has_funding_setup ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Bank Account Connected</h3>
            <p className="text-gray-600 mb-4">
              Your bank account is connected and ready for payroll funding.
            </p>
            {fundingStatus.bank_name && (
              <div className="bg-gray-50 rounded-lg p-4 inline-block">
                <p className="font-medium">{fundingStatus.bank_name}</p>
                <p className="text-sm text-gray-600">****{fundingStatus.bank_last4}</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                To process payroll, you need to connect a bank account that will be used to fund employee payments.
                This is a one-time setup process.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-900 mb-2">What happens next:</h4>
                <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                  <li>You'll securely connect your business bank account</li>
                  <li>We'll verify micro-deposits (1-2 business days)</li>
                  <li>Once verified, you can run payroll anytime</li>
                  <li>Funds are debited only when you approve payroll</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-1">Important Information:</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• Only checking accounts can be used for payroll funding</li>
                      <li>• You must be authorized to debit this account</li>
                      <li>• A 2.4% platform fee applies to all payroll transactions</li>
                      <li>• Funds are typically debited 1-2 days before pay date</li>
                    </ul>
                  </div>
                </div>
              </div>

              {setupError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-800">{setupError}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={onCancel}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSetupFunding}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <ButtonSpinner />
                    <span className="ml-2">Connecting...</span>
                  </>
                ) : (
                  'Connect Bank Account'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PayrollFundingSetup;