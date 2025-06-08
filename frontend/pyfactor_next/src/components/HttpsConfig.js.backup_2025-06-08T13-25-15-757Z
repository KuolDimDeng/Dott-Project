'use client';

import { useEffect, useState } from 'react';
import { resetCircuitBreakers } from '@/lib/axiosConfig';

/**
 * Component to handle HTTPS configuration and provide a button to reset circuit breakers
 * This is useful for resolving "Circuit breaker open" errors after switching to HTTPS
 */
export default function HttpsConfig() {
  const [isHttps, setIsHttps] = useState(false);
  const [resetStatus, setResetStatus] = useState('');
  
  useEffect(() => {
    // Check if we're using HTTPS
    setIsHttps(window.location.protocol === 'https:');
    
    // Register window function for console access
    window.__resetCircuitBreakers = resetCircuitBreakers;
    window.resetCircuitBreakers = () => {
      resetCircuitBreakers();
      console.log('[HttpsConfig] Circuit breakers manually reset');
      return true;
    };
    
    // If we're in HTTPS mode, auto-reset circuit breakers on first load
    if (window.location.protocol === 'https:') {
      resetCircuitBreakers();
      console.log('[HttpsConfig] Circuit breakers auto-reset for HTTPS mode');
    }
    
    return () => {
      // Cleanup
      delete window.__resetCircuitBreakers;
    };
  }, []);
  
  const handleReset = () => {
    try {
      resetCircuitBreakers();
      setResetStatus('Circuit breakers reset successfully');
      setTimeout(() => setResetStatus(''), 3000);
    } catch (error) {
      console.error('[HttpsConfig] Error resetting circuit breakers:', error);
      setResetStatus('Error resetting circuit breakers');
      setTimeout(() => setResetStatus(''), 3000);
    }
  };
  
  // Only show in development mode and when there's an issue
  if (process.env.NODE_ENV !== 'development' || window.location.search !== '?debug=true') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 z-50 max-w-xs">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Protocol: {isHttps ? 'HTTPS' : 'HTTP'}
          </span>
          <span className={`inline-flex h-3 w-3 rounded-full ${isHttps ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
        </div>
        
        <button
          onClick={handleReset}
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded"
        >
          Reset Circuit Breakers
        </button>
        
        {resetStatus && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            {resetStatus}
          </p>
        )}
      </div>
    </div>
  );
} 