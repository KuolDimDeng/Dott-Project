'use client';

import React, { useEffect, useState } from 'react';

export default function StripeEnvCheck() {
  const [diagnostics, setDiagnostics] = useState({});
  
  useEffect(() => {
    // Check environment variables on client side
    const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    // Get all NEXT_PUBLIC variables
    const publicVars = {};
    if (typeof window !== 'undefined') {
      // In browser, we need to check window.__NEXT_DATA__
      const nextData = window.__NEXT_DATA__;
      if (nextData && nextData.props && nextData.props.pageProps) {
        Object.keys(nextData.props.pageProps).forEach(key => {
          if (key.startsWith('NEXT_PUBLIC_')) {
            publicVars[key] = 'Found in pageProps';
          }
        });
      }
    }
    
    setDiagnostics({
      stripeKey: stripeKey || 'NOT FOUND',
      stripeKeyLength: stripeKey ? stripeKey.length : 0,
      stripeKeyType: stripeKey ? (stripeKey.startsWith('pk_test') ? 'TEST' : stripeKey.startsWith('pk_live') ? 'LIVE' : 'UNKNOWN') : 'N/A',
      nodeEnv: process.env.NODE_ENV,
      publicVarsCount: Object.keys(publicVars).length,
      timestamp: new Date().toISOString(),
      // Check if Stripe is loaded
      stripeLibraryLoaded: typeof window !== 'undefined' && window.Stripe ? 'YES' : 'NO'
    });
  }, []);
  
  if (process.env.NODE_ENV === 'production') {
    // Don't show in production unless there's an issue
    if (diagnostics.stripeKey && diagnostics.stripeKey !== 'NOT FOUND') {
      return null;
    }
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md z-50">
      <h3 className="font-bold text-red-600 mb-2">Stripe Environment Diagnostics</h3>
      <div className="text-xs space-y-1">
        <div>
          <span className="font-semibold">Stripe Key:</span>{' '}
          {diagnostics.stripeKey === 'NOT FOUND' ? (
            <span className="text-red-600">❌ NOT FOUND</span>
          ) : (
            <span className="text-green-600">✅ {diagnostics.stripeKey?.substring(0, 20)}...</span>
          )}
        </div>
        <div>
          <span className="font-semibold">Key Type:</span> {diagnostics.stripeKeyType}
        </div>
        <div>
          <span className="font-semibold">Environment:</span> {diagnostics.nodeEnv}
        </div>
        <div>
          <span className="font-semibold">Stripe Library:</span> {diagnostics.stripeLibraryLoaded}
        </div>
        <div>
          <span className="font-semibold">Public Vars Found:</span> {diagnostics.publicVarsCount}
        </div>
        <div className="text-gray-500">
          Generated: {diagnostics.timestamp}
        </div>
      </div>
      
      {diagnostics.stripeKey === 'NOT FOUND' && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
          <p className="font-semibold text-red-700">Issue Detected:</p>
          <p>The NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable is not available in the client bundle.</p>
          <p className="mt-1">This needs to be fixed at build time in Render.</p>
        </div>
      )}
    </div>
  );
}