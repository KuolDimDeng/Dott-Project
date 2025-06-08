'use client';


import { useState, useEffect } from 'react';
import { logger } from '@/utils/clientLogger';

/**
 * DashboardSetup Component
 * 
 * This component provides UI to set up the dashboard for a tenant
 */
export default function DashboardSetup({ tenantId, onSetupComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  const setupDashboard = async () => {
    setIsLoading(true);
    setError(null);
    setMessage('Setting up your dashboard...');

    try {
      const response = await fetch('/api/tenant/setup-dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Dashboard setup successful!');
        logger.info('[DashboardSetup] Dashboard setup complete:', data);
        
        // Wait a moment, then reload to show the new dashboard
        setTimeout(() => {
          if (onSetupComplete) {
            onSetupComplete();
          } else {
            window.location.reload();
          }
        }, 1500);
      } else {
        setError(data.message || 'Failed to set up dashboard');
        logger.error('[DashboardSetup] Dashboard setup failed:', data);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
      logger.error('[DashboardSetup] Dashboard setup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Dashboard Setup</h2>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-2">
          It looks like your custom dashboard hasn't been configured yet. 
          Would you like to set up your dashboard with the original layout?
        </p>
        <p className="text-sm text-gray-500">
          This will create dashboard elements for tenant ID: <span className="font-mono">{tenantId}</span>
        </p>
      </div>

      {message && !error && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded">
          {message}
          {isLoading && (
            <div className="mt-2 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={setupDashboard}
          disabled={isLoading}
          className={`px-4 py-2 rounded ${
            isLoading 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isLoading ? 'Setting Up...' : 'Set Up Dashboard'}
        </button>
      </div>
    </div>
  );
} 