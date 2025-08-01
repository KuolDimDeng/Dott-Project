import React, { useEffect, useState } from 'react';
import { ButtonSpinner } from '@/components/ui/StandardSpinner';

export const PlaidLinkComponent = ({ linkToken, onSuccess, onExit }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plaidHandler, setPlaidHandler] = useState(null);

  useEffect(() => {
    // Only load Plaid when we have a token
    if (!linkToken) {
      setError('No link token provided');
      setLoading(false);
      return;
    }

    let handler = null;
    let destroyed = false;

    const loadPlaid = async () => {
      try {
        // Wait for Plaid to be available
        let attempts = 0;
        while (!window.Plaid && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!window.Plaid) {
          throw new Error('Plaid SDK failed to load');
        }

        if (destroyed) return;

        // Create Plaid Link handler
        handler = window.Plaid.create({
          token: linkToken,
          onSuccess: (public_token, metadata) => {
            console.log('🏦 [PlaidLink] Success:', { public_token, metadata });
            onSuccess(public_token, metadata);
          },
          onExit: (err, metadata) => {
            console.log('🏦 [PlaidLink] Exit:', { err, metadata });
            if (onExit) onExit(err, metadata);
          },
          onEvent: (eventName, metadata) => {
            console.log('🏦 [PlaidLink] Event:', eventName, metadata);
          },
          onLoad: () => {
            console.log('🏦 [PlaidLink] Loaded successfully');
            setLoading(false);
          }
        });

        if (!destroyed) {
          setPlaidHandler(handler);
          // Auto-open when ready
          handler.open();
        }
      } catch (err) {
        console.error('🏦 [PlaidLink] Error loading Plaid:', err);
        if (!destroyed) {
          setError(err.message || 'Failed to load Plaid');
          setLoading(false);
        }
      }
    };

    loadPlaid();

    // Cleanup
    return () => {
      destroyed = true;
      if (handler) {
        handler.exit({ force: true });
        handler.destroy();
      }
    };
  }, [linkToken, onSuccess, onExit]);

  const handleClick = () => {
    if (plaidHandler) {
      plaidHandler.open();
    }
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-md">
        <p className="font-medium">Unable to connect to Plaid</p>
        <p className="text-sm mt-1">{error}</p>
        <p className="text-sm mt-2">Please try refreshing the page or contact support.</p>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading || !plaidHandler}
      className={`w-full py-3 px-4 rounded-md font-medium ${
        loading || !plaidHandler
          ? 'bg-blue-300 cursor-not-allowed text-white'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
    >
      {loading ? (
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