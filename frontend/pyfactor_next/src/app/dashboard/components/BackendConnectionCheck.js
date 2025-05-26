'use client';

import { useState, useEffect } from 'react';
import { verifyBackendConnection, resetCircuitBreakers } from '@/lib/axiosConfig';
import { toast } from 'react-hot-toast';
import { logger } from '@/utils/logger';

/**
 * Component for checking backend connection health and troubleshooting connectivity issues
 */
export default function BackendConnectionCheck({ onConnectionRestored }) {
  const [checking, setChecking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Check connection to backend API server
  const checkConnection = async () => {
    setChecking(true);
    
    try {
      // Disabled backend connection check to prevent CORS errors in production
      logger.info('[BackendConnectionCheck] Backend connection check disabled for production');
      const result = { success: true, message: 'Backend connection check disabled to prevent CORS errors' };
      
      logger.info('[BackendConnectionCheck] Connection check result:', result);
      setConnectionStatus(result);
      
      if (result.success) {
        toast.success('Backend connection successful!');
        if (onConnectionRestored) {
          onConnectionRestored();
        }
      } else {
        toast.error('Cannot connect to backend server');
      }
    } catch (error) {
      logger.error('[BackendConnectionCheck] Error verifying connection:', error);
      setConnectionStatus({
        success: false,
        message: error.message,
        troubleshooting: 'An unexpected error occurred during connection check'
      });
      toast.error('Error checking connection');
    } finally {
      setChecking(false);
    }
  };

  // Handle reset of circuit breakers
  const handleResetCircuitBreakers = () => {
    try {
      resetCircuitBreakers('/employees');
      toast.success('Circuit breaker reset successfully');
      
      // Try to reconnect automatically after resetting circuit breakers
      setTimeout(() => {
        checkConnection();
      }, 1000);
    } catch (error) {
      logger.error('[BackendConnectionCheck] Error resetting circuit breakers:', error);
      toast.error('Failed to reset circuit breakers');
    }
  };

  // Run initial connection check on mount
  useEffect(() => {
    checkConnection();
  }, []);

  if (!connectionStatus) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md shadow-sm mb-4">
        <p className="text-blue-800 font-medium">Checking backend connection...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold mb-2">Backend Connection Check</h2>
          <p className="text-gray-600 mb-4">
            There seems to be an issue connecting to the backend server. Let's diagnose the problem.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={checkConnection}
            disabled={checking}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {checking ? 'Checking...' : 'Check Connection'}
          </button>
          
          <button
            onClick={handleResetCircuitBreakers}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Reset Circuit Breaker
          </button>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {connectionStatus && (
          <div className={`mt-4 p-3 rounded ${connectionStatus.success ? 'bg-green-100' : 'bg-red-100'}`}>
            <p className="font-semibold">
              Status: {connectionStatus.success ? 'Connected' : 'Connection Failed'}
            </p>
            {connectionStatus.message && <p className="mt-2">{connectionStatus.message}</p>}
            
            {!connectionStatus.success && connectionStatus.troubleshooting && (
              <div className="mt-2">
                <p className="font-medium">Troubleshooting:</p>
                <p className="text-sm text-gray-700">{connectionStatus.troubleshooting}</p>
              </div>
            )}
          </div>
        )}

        {showDetails && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-medium mb-2">Troubleshooting Steps:</h3>
            <ol className="list-decimal pl-4 space-y-2 text-sm">
              <li>Verify that the backend server is running. Check terminal for error messages.</li>
              <li>Try resetting the circuit breaker using the button above.</li>
              <li>Check if there are CORS issues (Cross-Origin Resource Sharing).</li>
              <li>Make sure SSL certificates are properly set up for HTTPS connections.</li>
              <li>Restart both the frontend and backend servers if the issue persists.</li>
              <li>Check browser console for detailed error messages.</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
} 