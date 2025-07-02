'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, DevicePhoneMobileIcon, EnvelopeIcon, KeyIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/hooks/useToast';

export default function MFASetupPage() {
  const router = useRouter();
  const toast = useToast();
  const [selectedMethod, setSelectedMethod] = useState('totp');
  const [loading, setLoading] = useState(false);

  const mfaMethods = [
    {
      id: 'totp',
      name: 'Authenticator App',
      description: 'Use an app like Google Authenticator or Authy',
      icon: DevicePhoneMobileIcon,
      recommended: true
    },
    {
      id: 'email',
      name: 'Email',
      description: 'Receive verification codes via email',
      icon: EnvelopeIcon,
      recommended: false
    },
    {
      id: 'recovery-code',
      name: 'Recovery Codes',
      description: 'Generate one-time use backup codes',
      icon: KeyIcon,
      recommended: false
    }
  ];

  const handleSetup = async () => {
    try {
      setLoading(true);
      
      // Update user preferences
      const response = await fetch('/api/user/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled: true, 
          preferredMethod: selectedMethod 
        })
      });
      
      if (response.ok) {
        toast.success('Redirecting to Auth0 MFA setup...');
        
        // Redirect to Auth0's MFA enrollment page
        setTimeout(() => {
          window.location.href = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/authorize?` +
            `client_id=${process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(window.location.origin + '/api/auth/callback')}&` +
            `response_type=code&` +
            `scope=openid profile email&` +
            `screen_hint=mfa`;
        }, 1000);
      } else {
        throw new Error('Failed to update MFA preferences');
      }
    } catch (error) {
      console.error('Error setting up MFA:', error);
      toast.error('Failed to setup MFA. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Security Settings
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900">Set Up Two-Factor Authentication</h1>
          <p className="mt-2 text-gray-600">
            Add an extra layer of security to your account by enabling two-factor authentication
          </p>
        </div>

        {/* Method Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Preferred Method</h2>
          
          <div className="space-y-3">
            {mfaMethods.map((method) => {
              const Icon = method.icon;
              return (
                <label
                  key={method.id}
                  className={`
                    flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${selectedMethod === method.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="mfa-method"
                    value={method.id}
                    checked={selectedMethod === method.id}
                    onChange={() => setSelectedMethod(method.id)}
                    className="mt-1 mr-3"
                  />
                  <Icon className="w-6 h-6 text-gray-400 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">{method.name}</p>
                      {method.recommended && (
                        <span className="ml-2 text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{method.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">What happens next?</h3>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
            <li>You'll be redirected to Auth0 to complete the setup</li>
            <li>Follow the instructions to configure your chosen method</li>
            <li>Test your setup by entering a verification code</li>
            <li>Save any backup codes provided for account recovery</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSetup}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up...' : 'Continue Setup'}
          </button>
        </div>
      </div>
    </div>
  );
}