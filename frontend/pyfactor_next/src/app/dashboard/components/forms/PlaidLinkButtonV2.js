'use client';

import React, { useCallback, useEffect, useState } from 'react';
import PlaidScriptWrapper from '@/components/PlaidScriptWrapper';
import { ButtonSpinner } from '@/components/ui/StandardSpinner';

function PlaidLinkContent({ linkToken, onSuccess, onExit }) {
  const [loading, setLoading] = useState(false);
  const [handler, setHandler] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!linkToken || !window.Plaid) {
      console.log('🏦 [PlaidLinkV2] Missing requirements:', { linkToken: !!linkToken, Plaid: !!window.Plaid });
      return;
    }

    console.log('🏦 [PlaidLinkV2] Creating Plaid handler with token:', linkToken.substring(0, 20) + '...');

    try {
      const plaidHandler = window.Plaid.create({
        token: linkToken,
        onSuccess: (public_token, metadata) => {
          console.log('🏦 [PlaidLinkV2] Success!', { public_token, metadata });
          if (onSuccess) {
            onSuccess(public_token, metadata);
          }
        },
        onExit: (err, metadata) => {
          console.log('🏦 [PlaidLinkV2] Exit', { err, metadata });
          setLoading(false);
          if (onExit) {
            onExit(err, metadata);
          }
        },
        onEvent: (eventName, metadata) => {
          console.log('🏦 [PlaidLinkV2] Event:', eventName);
        },
        onLoad: () => {
          console.log('🏦 [PlaidLinkV2] Plaid Link loaded');
          setLoading(false);
        }
      });

      setHandler(plaidHandler);
      console.log('🏦 [PlaidLinkV2] Handler created successfully');
    } catch (err) {
      console.error('🏦 [PlaidLinkV2] Error creating handler:', err);
      setError(err.message || 'Failed to create Plaid handler');
      setLoading(false);
    }

    // Cleanup
    return () => {
      if (handler && handler.destroy) {
        try {
          handler.destroy();
        } catch (e) {
          console.error('🏦 [PlaidLinkV2] Error destroying handler:', e);
        }
      }
    };
  }, [linkToken, onSuccess, onExit]);

  const handleClick = useCallback(() => {
    if (!handler) {
      console.error('🏦 [PlaidLinkV2] No handler available');
      return;
    }

    console.log('🏦 [PlaidLinkV2] Opening Plaid Link...');
    setLoading(true);
    handler.open();
  }, [handler]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-md">
        <p className="font-medium">Unable to connect to Plaid</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Refresh page to try again
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={!handler || loading}
      className={`w-full py-3 px-4 rounded-md font-medium ${
        !handler || loading
          ? 'bg-blue-300 cursor-not-allowed text-white'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <ButtonSpinner />
          Connecting...
        </div>
      ) : !handler ? (
        'Preparing...'
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
}

export default function PlaidLinkButtonV2({ linkToken, onSuccess, onExit }) {
  return (
    <PlaidScriptWrapper>
      <PlaidLinkContent
        linkToken={linkToken}
        onSuccess={onSuccess}
        onExit={onExit}
      />
    </PlaidScriptWrapper>
  );
}