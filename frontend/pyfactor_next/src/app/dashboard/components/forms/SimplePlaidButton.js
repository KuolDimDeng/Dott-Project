'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ButtonSpinner } from '@/components/ui/StandardSpinner';
import plaidManager from '@/utils/plaidManager';

export const SimplePlaidButton = ({ linkToken, onSuccess, onExit }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const handlerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    if (!linkToken) {
      setError('No link token provided');
      setLoading(false);
      return;
    }

    const initializePlaid = async () => {
      try {
        console.log('🏦 [SimplePlaid] Initializing with token:', linkToken?.substring(0, 20) + '...');
        
        const config = {
          token: linkToken,
          onSuccess: (public_token, metadata) => {
            console.log('🏦 [SimplePlaid] Success:', public_token);
            if (mountedRef.current && onSuccess) {
              onSuccess(public_token, metadata);
            }
          },
          onExit: (err, metadata) => {
            console.log('🏦 [SimplePlaid] Exit:', err);
            if (mountedRef.current && onExit) {
              onExit(err, metadata);
            }
          },
          onEvent: (eventName, metadata) => {
            console.log('🏦 [SimplePlaid] Event:', eventName);
          },
          onLoad: () => {
            console.log('🏦 [SimplePlaid] Plaid loaded');
            if (mountedRef.current) {
              setLoading(false);
            }
          }
        };

        // Use PlaidManager to create handler
        const handler = await plaidManager.createHandler(config);
        
        if (mountedRef.current) {
          handlerRef.current = handler;
          setLoading(false);
        } else {
          // Component unmounted, destroy handler
          handler.destroy();
        }
        
      } catch (err) {
        console.error('🏦 [SimplePlaid] Error:', err);
        if (mountedRef.current) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    initializePlaid();

    return () => {
      mountedRef.current = false;
      if (handlerRef.current && handlerRef.current.destroy) {
        try {
          handlerRef.current.destroy();
        } catch (e) {
          console.error('🏦 [SimplePlaid] Cleanup error:', e);
        }
      }
    };
  }, [linkToken, onSuccess, onExit]);

  const handleClick = () => {
    console.log('🏦 [SimplePlaid] Button clicked');
    if (handlerRef.current) {
      handlerRef.current.open();
    } else {
      console.error('🏦 [SimplePlaid] No handler available');
      setError('Plaid is not ready. Please try again.');
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
      disabled={loading}
      className={`w-full py-3 px-4 rounded-md font-medium ${
        loading
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
          Connect with Plaid
        </div>
      )}
    </button>
  );
};

export default SimplePlaidButton;