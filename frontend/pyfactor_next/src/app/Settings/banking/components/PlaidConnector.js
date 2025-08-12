'use client';

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ButtonSpinner } from '@/components/ui/StandardSpinner';

// Dynamic import for Plaid Link (in case it's not installed)
let usePlaidLink = null;
try {
  const plaidModule = require('react-plaid-link');
  usePlaidLink = plaidModule.usePlaidLink;
} catch (e) {
  console.warn('react-plaid-link not installed, using fallback');
}

/**
 * Plaid Bank Connection Component
 * Handles Plaid Link integration for US, CA, and EU banks
 */
export default function PlaidConnector({ userCountry, onSuccess, onCancel, isConnecting, setIsConnecting }) {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createLinkToken();
  }, [userCountry]);

  /**
   * Create Plaid Link token
   */
  const createLinkToken = async () => {
    try {
      const response = await fetch('/api/banking/plaid/link-token/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country_code: userCountry || 'US'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLinkToken(data.link_token);
      } else {
        console.error('Failed to create link token');
        toast.error('Failed to initialize Plaid. Please try again.');
      }
    } catch (error) {
      console.error('Error creating link token:', error);
      toast.error('Failed to initialize Plaid. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle successful Plaid connection
   */
  const onPlaidSuccess = useCallback(async (public_token, metadata) => {
    setIsConnecting(true);
    
    try {
      // Exchange public token for access token and save connection
      const response = await fetch('/api/banking/plaid/exchange-token/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_token,
          institution: metadata.institution,
          accounts: metadata.accounts
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Bank account connected successfully!');
        onSuccess(data.connection);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to connect bank account');
      }
    } catch (error) {
      console.error('Error exchanging token:', error);
      toast.error('Failed to connect bank account');
    } finally {
      setIsConnecting(false);
    }
  }, [onSuccess, setIsConnecting]);

  /**
   * Plaid Link configuration
   */
  const config = {
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: (err, metadata) => {
      if (err) {
        console.error('Plaid Link error:', err);
        if (err.error_code !== 'user_close_link') {
          toast.error('Connection failed. Please try again.');
        }
      }
    },
  };

  // Use Plaid Link if available, otherwise provide fallback
  const plaidLink = usePlaidLink ? usePlaidLink(config) : { open: () => {}, ready: false };
  const { open, ready } = plaidLink;

  /**
   * Handle connect button click
   */
  const handleConnect = () => {
    if (!usePlaidLink) {
      toast.error('Plaid integration is not available. Please contact support.');
      return;
    }
    if (!ready) {
      toast.error('Plaid is still loading. Please wait a moment.');
      return;
    }
    open();
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <ButtonSpinner />
        <p className="mt-2 text-sm text-gray-500">Initializing secure connection...</p>
      </div>
    );
  }

  if (!linkToken) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-red-600">
          Failed to initialize Plaid. Please refresh and try again.
        </p>
        <button
          onClick={createLinkToken}
          className="mt-2 text-sm text-blue-600 hover:text-blue-500"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900">Secure Bank Connection</h4>
        <ul className="mt-2 text-sm text-blue-700 list-disc list-inside">
          <li>Your login credentials are encrypted end-to-end</li>
          <li>We never store your username or password</li>
          <li>Connection is verified by your bank</li>
          <li>You can disconnect at any time</li>
        </ul>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handleConnect}
          disabled={!ready || isConnecting}
          className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? (
            <>
              <ButtonSpinner />
              <span className="ml-2">Connecting...</span>
            </>
          ) : (
            'Connect with Plaid'
          )}
        </button>
        
        <button
          onClick={onCancel}
          disabled={isConnecting}
          className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        By connecting your bank account, you agree to our Terms of Service and authorize 
        us to debit your account for approved transactions.
      </p>
    </div>
  );
}