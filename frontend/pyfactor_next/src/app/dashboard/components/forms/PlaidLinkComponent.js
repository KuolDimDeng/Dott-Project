import React, { useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { ButtonSpinner } from '@/components/ui/StandardSpinner';

export const PlaidLinkComponent = ({ linkToken, onSuccess, onExit }) => {
  const config = {
    token: linkToken,
    onSuccess: onSuccess,
    onExit: onExit,
    onEvent: (eventName, metadata) => {
      console.log('🏦 [PlaidLink] Event:', eventName, metadata);
    },
  };

  const { open, ready, error } = usePlaidLink(config);

  useEffect(() => {
    if (ready && open) {
      console.log('🏦 [PlaidLink] Opening Plaid Link');
      open();
    }
  }, [ready, open]);

  if (error) {
    console.error('🏦 [PlaidLink] Error:', error);
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-md">
        <p className="font-medium">Error loading Plaid</p>
        <p className="text-sm mt-1">Please try again or contact support if the issue persists.</p>
      </div>
    );
  }

  return (
    <button
      onClick={() => open()}
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
          Continue with Plaid
        </div>
      )}
    </button>
  );
};

export default PlaidLinkComponent;