'use client';

import React, { useEffect, useState } from 'react';
import plaidManager from '@/utils/plaidManager';

export const PlaidDebugger = () => {
  const [plaidStatus, setPlaidStatus] = useState({
    scriptLoaded: false,
    plaidAvailable: false,
    checkCount: 0,
    error: null,
    managerInitialized: false
  });

  useEffect(() => {
    let interval;
    let count = 0;

    const checkPlaid = async () => {
      count++;
      
      // Check if script tag exists
      const scripts = Array.from(document.scripts);
      const plaidScript = scripts.find(s => s.src.includes('plaid.com'));
      
      // Check if window.Plaid exists
      const plaidAvailable = typeof window.Plaid !== 'undefined';
      
      // Check PlaidManager status
      const managerInitialized = plaidManager.isInitialized;
      
      setPlaidStatus({
        scriptLoaded: !!plaidScript,
        plaidAvailable,
        checkCount: count,
        scriptSrc: plaidScript?.src,
        plaidType: plaidAvailable ? typeof window.Plaid : 'undefined',
        plaidKeys: plaidAvailable ? Object.keys(window.Plaid) : [],
        managerInitialized,
        hasCreate: plaidAvailable && window.Plaid.create ? 'Yes' : 'No'
      });

      // Stop checking after 10 seconds
      if (count > 100 || (plaidAvailable && managerInitialized)) {
        clearInterval(interval);
      }
    };

    // Check immediately
    checkPlaid();

    // Then check every 100ms
    interval = setInterval(checkPlaid, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-xs max-w-sm">
      <h3 className="font-bold mb-2">Plaid Debug Info</h3>
      <div className="space-y-1">
        <div>Script Tag: {plaidStatus.scriptLoaded ? '✅' : '❌'}</div>
        <div>window.Plaid: {plaidStatus.plaidAvailable ? '✅' : '❌'}</div>
        <div>Manager Ready: {plaidStatus.managerInitialized ? '✅' : '❌'}</div>
        <div>Has create(): {plaidStatus.hasCreate}</div>
        <div>Check Count: {plaidStatus.checkCount}</div>
        {plaidStatus.scriptSrc && (
          <div className="text-xs break-all">Script: {plaidStatus.scriptSrc}</div>
        )}
        {plaidStatus.plaidType && (
          <div>Plaid Type: {plaidStatus.plaidType}</div>
        )}
        {plaidStatus.plaidKeys && plaidStatus.plaidKeys.length > 0 && (
          <div>Plaid Methods: {plaidStatus.plaidKeys.join(', ')}</div>
        )}
      </div>
    </div>
  );
};

export default PlaidDebugger;