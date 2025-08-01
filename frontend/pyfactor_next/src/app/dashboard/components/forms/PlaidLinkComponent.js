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
    let initialized = false;

    const loadPlaid = async () => {
      try {
        // Check if already initialized (React StrictMode protection)
        if (initialized) {
          console.log('🏦 [PlaidLink] Already initialized, skipping');
          return;
        }

        // Wait for Plaid to be available
        let attempts = 0;
        while (!window.Plaid && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!window.Plaid) {
          throw new Error('Plaid SDK failed to load after 3 seconds');
        }

        if (destroyed) return;

        // Add a small delay to ensure SDK is fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('🏦 [PlaidLink] Creating Plaid handler...');
        
        // Wrap in try-catch to handle SDK errors
        try {
          handler = window.Plaid.create({
            token: linkToken,
            onSuccess: (public_token, metadata) => {
              console.log('🏦 [PlaidLink] Success:', { public_token, metadata });
              if (!destroyed && onSuccess) {
                onSuccess(public_token, metadata);
              }
            },
            onExit: (err, metadata) => {
              console.log('🏦 [PlaidLink] Exit:', { err, metadata });
              if (!destroyed && onExit) {
                onExit(err, metadata);
              }
            },
            onEvent: (eventName, metadata) => {
              console.log('🏦 [PlaidLink] Event:', eventName, metadata);
            },
            onLoad: () => {
              console.log('🏦 [PlaidLink] Loaded successfully');
              if (!destroyed) {
                setLoading(false);
              }
            }
          });

          initialized = true;

          if (!destroyed && handler) {
            setPlaidHandler(handler);
            // Don't auto-open in StrictMode - let user click
            console.log('🏦 [PlaidLink] Handler ready, waiting for user interaction');
          }
        } catch (sdkError) {
          console.error('🏦 [PlaidLink] SDK create error:', sdkError);
          // Retry once after a delay
          if (!destroyed) {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!destroyed && window.Plaid) {
              try {
                handler = window.Plaid.create({
                  token: linkToken,
                  onSuccess: (public_token, metadata) => {
                    if (!destroyed && onSuccess) {
                      onSuccess(public_token, metadata);
                    }
                  },
                  onExit: (err, metadata) => {
                    if (!destroyed && onExit) {
                      onExit(err, metadata);
                    }
                  }
                });
                initialized = true;
                if (!destroyed) {
                  setPlaidHandler(handler);
                  setLoading(false);
                }
              } catch (retryError) {
                throw retryError;
              }
            }
          }
        }
      } catch (err) {
        console.error('🏦 [PlaidLink] Error loading Plaid:', err);
        if (!destroyed) {
          setError(err.message || 'Failed to load Plaid');
          setLoading(false);
        }
      }
    };

    // Delay initialization to avoid React StrictMode issues
    const timeoutId = setTimeout(loadPlaid, 10);

    // Cleanup
    return () => {
      destroyed = true;
      clearTimeout(timeoutId);
      if (handler && handler.destroy) {
        try {
          handler.exit({ force: true });
          handler.destroy();
        } catch (e) {
          console.error('🏦 [PlaidLink] Cleanup error:', e);
        }
      }
    };
  }, [linkToken]); // Remove onSuccess and onExit from dependencies to avoid re-initialization

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