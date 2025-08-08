'use client';

import React, { useState, useEffect } from 'react';
import PlaidConnector from './PlaidConnector';
import WiseConnector from './WiseConnector';
import { XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Add Bank Account Component
 * Routes to appropriate provider based on user's country
 */
export default function AddBankAccount({ provider, userCountry, onSuccess, onCancel }) {
  const [isConnecting, setIsConnecting] = useState(false);

  /**
   * Handle successful connection
   */
  const handleSuccess = (connectionData) => {
    onSuccess(connectionData);
  };

  return (
    <div className="bg-white shadow sm:rounded-lg mb-6">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Connect Bank Account
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>
            {provider === 'plaid' 
              ? 'Connect your bank account securely using Plaid. Your credentials are encrypted and never stored on our servers.'
              : 'Connect your international bank account using Wise. We'll securely store your bank details with our payment processor.'}
          </p>
        </div>

        <div className="mt-5">
          {provider === 'plaid' ? (
            <PlaidConnector
              userCountry={userCountry}
              onSuccess={handleSuccess}
              onCancel={onCancel}
              isConnecting={isConnecting}
              setIsConnecting={setIsConnecting}
            />
          ) : (
            <WiseConnector
              userCountry={userCountry}
              onSuccess={handleSuccess}
              onCancel={onCancel}
              isConnecting={isConnecting}
              setIsConnecting={setIsConnecting}
            />
          )}
        </div>
      </div>
    </div>
  );
}