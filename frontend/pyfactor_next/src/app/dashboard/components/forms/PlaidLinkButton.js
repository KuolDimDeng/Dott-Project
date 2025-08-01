'use client';

import React from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { ButtonSpinner } from '@/components/ui/StandardSpinner';

export const PlaidLinkButton = ({ linkToken, onSuccess, onExit }) => {
  const config = {
    token: linkToken,
    onSuccess: (public_token, metadata) => {
      console.log('🏦 [PlaidLink] Success with public_token:', public_token);
      console.log('🏦 [PlaidLink] Metadata:', metadata);
      if (onSuccess) {
        onSuccess(public_token, metadata);
      }
    },
    onExit: (err, metadata) => {
      console.log('🏦 [PlaidLink] Exit:', err, metadata);
      if (onExit) {
        onExit(err, metadata);
      }
    },
    onEvent: (eventName, metadata) => {
      console.log('🏦 [PlaidLink] Event:', eventName, metadata);
    },
    onLoad: () => {
      console.log('🏦 [PlaidLink] Loaded successfully');
    }
  };

  const { open, ready, error } = usePlaidLink(config);

  // Log the state
  console.log('🏦 [PlaidLink] Component state:', { 
    ready, 
    error, 
    hasToken: !!linkToken,
    tokenLength: linkToken?.length 
  });

  if (error) {
    console.error('🏦 [PlaidLink] Error:', error);
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-md">
        <p className="font-medium">Unable to connect to Plaid</p>
        <p className="text-sm mt-1">{error.message || 'Failed to load Plaid'}</p>
        <p className="text-sm mt-2">Please try refreshing the page or contact support.</p>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        console.log('🏦 [PlaidLink] Button clicked, ready:', ready);
        if (ready) {
          open();
        }
      }}
      disabled={!ready}
      className={`w-full py-3 px-4 rounded-md font-medium ${
        !ready
          ? 'bg-blue-300 cursor-not-allowed text-white'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
    >
      {!ready ? (
        <div className="flex items-center justify-center">
          <ButtonSpinner />
          Loading Plaid...
        </div>
      ) : (
        <div className="flex items-center justify-center">
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
          </svg>
          Connect with Plaid
        </div>
      )}
    </button>
  );
};

export default PlaidLinkButton;