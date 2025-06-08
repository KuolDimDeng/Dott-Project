'use client';


import React, { useEffect, useState, useCallback } from 'react';
import { useTenantRecovery } from '@/hooks/useTenantRecovery';
import { logger } from '@/utils/logger';
import { isCognitoUnreliable } from '@/utils/networkMonitor';

/**
 * TenantRecoveryWrapper
 * 
 * A component to wrap critical parts of the application and provide
 * recovery mechanisms when API calls fail or network issues occur.
 */
const TenantRecoveryWrapper = ({ 
  children, 
  pathTenantId = null,
  autoRedirect = true,
  showRecoveryState = false, 
  className = '' 
}) => {
  const recovery = useTenantRecovery({
    autoRedirect,
    pathTenantId,
    recoveryThreshold: 2 // Lower threshold for faster recovery
  });
  
  const [showDebug, setShowDebug] = useState(false);
  const [cognitoStatus, setCognitoStatus] = useState({
    unreliable: false
  });
  
  // Memoize the triggerRecovery function to prevent dependency changes
  const triggerRecoveryIfNeeded = useCallback(() => {
    if (!recovery.isRecoveryMode) {
      recovery.triggerRecovery().catch(err => {
        logger.error('[TenantRecoveryWrapper] Error triggering recovery:', err);
      });
    }
  }, [recovery.isRecoveryMode, recovery.triggerRecovery]);
  
  // Check Cognito reliability periodically
  useEffect(() => {
    // Check initially
    setCognitoStatus({
      unreliable: isCognitoUnreliable()
    });
    
    // Setup interval to check every 5 seconds
    const intervalId = setInterval(() => {
      const unreliable = isCognitoUnreliable();
      setCognitoStatus({ unreliable });
      
      if (unreliable) {
        logger.warn('[TenantRecoveryWrapper] Cognito connectivity appears unreliable');
        
        // Trigger recovery mode if Cognito is unreliable
        triggerRecoveryIfNeeded();
      }
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [triggerRecoveryIfNeeded]);
  
  // Toggle debug panel with keyboard shortcut (Ctrl+Shift+D)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDebug(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Auto-recover on abrupt connection failure
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let offlineTimeout = null;
    
    const handleOffline = () => {
      logger.info('[TenantRecoveryWrapper] Network went offline');
      
      // Set a timeout to trigger recovery mode if network stays offline
      offlineTimeout = setTimeout(() => {
        triggerRecoveryIfNeeded();
      }, 3000); // Wait 3 seconds before activating
    };
    
    const handleOnline = () => {
      // Clear offline timeout if network recovered quickly
      if (offlineTimeout) {
        clearTimeout(offlineTimeout);
        offlineTimeout = null;
      }
    };
    
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (offlineTimeout) clearTimeout(offlineTimeout);
    };
  }, [triggerRecoveryIfNeeded]);
  
  return (
    <div className={`tenant-recovery-wrapper ${className}`}>
      {(showRecoveryState && (recovery.isRecoveryMode || cognitoStatus.unreliable)) && (
        <div className="tenant-recovery-banner p-2 bg-amber-100 text-amber-800 text-sm text-center border-b border-amber-200">
          <span>Running in recovery mode – Some features may be limited</span>
          {recovery.recoveredTenantId && (
            <span className="ml-2 font-mono text-xs">Tenant: {recovery.recoveredTenantId}</span>
          )}
        </div>
      )}
      
      {children}
      
      {/* Debug panel (hidden by default, toggle with Ctrl+Shift+D) */}
      {showDebug && (
        <div className="fixed bottom-0 right-0 bg-gray-900 text-white p-4 text-xs font-mono rounded-tl-md max-w-md max-h-80 overflow-auto z-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Tenant Recovery Debug</h3>
            <button 
              onClick={() => setShowDebug(false)}
              className="text-gray-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div>Recovery Mode:</div>
            <div className={recovery.isRecoveryMode ? 'text-green-400' : 'text-gray-400'}>
              {recovery.isRecoveryMode ? 'ACTIVE' : 'Inactive'}
            </div>
            
            <div>Attempts:</div>
            <div>{recovery.recoveryAttempts}</div>
            
            <div>Tenant ID:</div>
            <div className="truncate">{recovery.recoveredTenantId || 'None'}</div>
            
            <div>Network:</div>
            <div className={
              recovery.networkStatus === 'excellent' || recovery.networkStatus === 'good' 
                ? 'text-green-400' 
                : recovery.networkStatus === 'fair' 
                  ? 'text-yellow-400'
                  : 'text-red-400'
            }>
              {recovery.networkStatus}
            </div>
            
            <div>Cognito Status:</div>
            <div className={cognitoStatus.unreliable ? 'text-red-400' : 'text-green-400'}>
              {cognitoStatus.unreliable ? 'UNRELIABLE' : 'OK'}
            </div>
          </div>
          
          <div className="mt-3 flex space-x-2">
            <button
              onClick={() => recovery.triggerRecovery()}
              className="bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
            >
              Trigger Recovery
            </button>
            
            <button
              onClick={() => recovery.emergencyRecover()}
              className="bg-red-700 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
            >
              Emergency Recovery
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantRecoveryWrapper; 