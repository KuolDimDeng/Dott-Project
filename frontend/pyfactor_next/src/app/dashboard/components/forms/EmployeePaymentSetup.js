'use client';

import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';
import { CenteredSpinner, ButtonSpinner } from '@/components/ui/StandardSpinner';
import { 
  CreditCardIcon, 
  DevicePhoneMobileIcon, 
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

const EmployeePaymentSetup = ({ employee, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [currentSetup, setCurrentSetup] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState(employee?.phone_number || '');
  const [mobileProvider, setMobileProvider] = useState('');
  const toast = useToast();

  useEffect(() => {
    checkPaymentOptions();
  }, []);

  const checkPaymentOptions = async () => {
    try {
      setChecking(true);
      
      // Get available payment methods for employee's country
      const response = await axiosInstance.get(
        `/api/payroll/payment-options/${employee.country}/`
      );
      
      setPaymentMethods(response.data.methods);
      setCurrentSetup(response.data.current_setup);
      
      // Pre-select if only one option
      if (response.data.methods.length === 1) {
        setSelectedMethod(response.data.methods[0].type);
      }
      
    } catch (error) {
      console.error('Error checking payment options:', error);
      toast.showError('Failed to load payment options');
    } finally {
      setChecking(false);
    }
  };

  const handleBankSetup = async () => {
    try {
      setLoading(true);
      
      // Determine which provider to use
      const provider = paymentMethods.find(m => m.type === 'bank_transfer')?.provider;
      
      let response;
      if (provider === 'stripe') {
        response = await axiosInstance.post('/api/payroll/employee/bank-setup/');
      } else if (provider === 'wise') {
        response = await axiosInstance.post('/api/payroll/employee/wise-invite/');
      }
      
      if (response.data.onboarding_url) {
        // Redirect to provider's onboarding
        window.location.href = response.data.onboarding_url;
      } else if (response.data.success) {
        toast.showSuccess('Setup initiated. Check your email for instructions.');
        onComplete && onComplete();
      }
      
    } catch (error) {
      console.error('Error setting up bank:', error);
      toast.showError('Failed to initiate bank setup');
    } finally {
      setLoading(false);
    }
  };

  const handleMobileMoneySetup = async () => {
    if (!phoneNumber) {
      toast.showError('Please enter your mobile money phone number');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await axiosInstance.post('/api/payroll/employee/mobile-setup/', {
        phone_number: phoneNumber,
        provider: mobileProvider || 'auto'
      });
      
      if (response.data.success) {
        toast.showSuccess('Mobile money setup complete!');
        onComplete && onComplete({
          method: 'mobile_money',
          phone: response.data.phone_number,
          provider: response.data.provider
        });
      }
      
    } catch (error) {
      console.error('Error setting up mobile money:', error);
      toast.showError(error.response?.data?.error || 'Failed to setup mobile money');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return <CenteredSpinner />;
  }

  // Already set up
  if (currentSetup?.status === 'active') {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <CheckCircleIcon className="h-8 w-8 text-green-500 mr-3" />
          <h2 className="text-xl font-bold">Payment Method Active</h2>
        </div>
        
        <p className="text-gray-600 mb-4">
          Your {currentSetup.method} payment method is set up and ready to receive payments.
        </p>
        
        {currentSetup.method === 'mobile_money' && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-medium">Mobile Money Details:</p>
            <p className="text-sm text-gray-600">
              Provider: {currentSetup.provider}<br />
              Number: {currentSetup.phone_display}
            </p>
          </div>
        )}
        
        <button
          onClick={() => setCurrentSetup(null)}
          className="mt-4 text-blue-600 hover:text-blue-800 text-sm"
        >
          Change payment method
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-bold mb-6">Set Up Payment Method</h2>
      
      {paymentMethods.length === 0 ? (
        <div className="text-center py-8">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-400 mb-4" />
          <p className="text-gray-600">
            No payment methods available for your country yet.
            Please contact support for assistance.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {paymentMethods.map((method) => (
              <label
                key={method.type}
                className={`relative flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                  selectedMethod === method.type ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name="payment-method"
                  value={method.type}
                  checked={selectedMethod === method.type}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                />
                
                <div className="flex-1">
                  <div className="flex items-center">
                    {method.type === 'bank_transfer' ? (
                      <BanknotesIcon className="h-6 w-6 text-gray-600 mr-3" />
                    ) : (
                      <DevicePhoneMobileIcon className="h-6 w-6 text-gray-600 mr-3" />
                    )}
                    <div>
                      <p className="font-medium">{method.name}</p>
                      <p className="text-sm text-gray-500">
                        Processing: {method.processing_time}
                      </p>
                    </div>
                  </div>
                </div>
                
                {selectedMethod === method.type && (
                  <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                )}
              </label>
            ))}
          </div>

          {/* Mobile Money Setup */}
          {selectedMethod === 'mobile_money' && (
            <div className="border-t pt-6">
              <h3 className="font-medium mb-4">Mobile Money Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter your mobile money number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Include country code (e.g., +254 for Kenya)
                  </p>
                </div>
                
                {paymentMethods.find(m => m.type === 'mobile_money')?.available_providers?.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Provider (Optional)
                    </label>
                    <select
                      value={mobileProvider}
                      onChange={(e) => setMobileProvider(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Auto-detect</option>
                      {paymentMethods.find(m => m.type === 'mobile_money')?.available_providers.map(provider => (
                        <option key={provider} value={provider}>
                          {provider.replace('_', ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleMobileMoneySetup}
                disabled={loading || !phoneNumber}
                className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <ButtonSpinner />
                    <span className="ml-2">Setting up...</span>
                  </>
                ) : (
                  'Set Up Mobile Money'
                )}
              </button>
            </div>
          )}

          {/* Bank Transfer Setup */}
          {selectedMethod === 'bank_transfer' && (
            <div className="border-t pt-6">
              <h3 className="font-medium mb-4">Bank Account Setup</h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  You'll be redirected to securely add your bank details.
                  Your employer will never see your bank information.
                </p>
              </div>
              
              <button
                onClick={handleBankSetup}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <ButtonSpinner />
                    <span className="ml-2">Redirecting...</span>
                  </>
                ) : (
                  'Continue to Bank Setup'
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmployeePaymentSetup;