'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTenantIdFromCognito, updateTenantIdInCognito } from '@/utils/tenantUtils';

export default function DashboardDebugSetup() {
  const [tenantId, setTenantId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [availableTenants, setAvailableTenants] = useState([]);
  const router = useRouter();

  useEffect(() => {
    // Try to get tenant ID from Cognito
    const fetchTenantId = async () => {
      const storedTenantId = await getTenantIdFromCognito();
      if (storedTenantId) {
        setTenantId(storedTenantId);
      }
    };
    
    fetchTenantId();
    
    // Try to fetch available tenants (in a real app, this would be restricted by permissions)
    const fetchTenants = async () => {
      try {
        const response = await fetch('/api/tenant/list');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.tenants) {
            setAvailableTenants(data.tenants);
          }
        }
      } catch (err) {
        console.error('Error fetching tenants:', err);
      }
    };
    
    fetchTenants();
  }, []);

  const setupDashboard = async () => {
    if (!tenantId) {
      setError('Please enter a tenant ID');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setMessage('Setting up dashboard...');

    try {
      // First update Cognito with the tenant ID
      const updateResult = await updateTenantIdInCognito(tenantId);
      if (!updateResult) {
        setError('Failed to update Cognito with tenant ID');
        setIsLoading(false);
        return;
      }
      
      // Then setup the dashboard
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
        
        // Wait a moment, then redirect to tenant dashboard
        setTimeout(() => {
          router.push(`/${tenantId}/dashboard`);
        }, 1500);
      } else {
        setError(data.message || 'Failed to set up dashboard');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const viewDashboard = () => {
    if (!tenantId) {
      setError('Please enter a tenant ID');
      return;
    }
    
    router.push(`/${tenantId}/dashboard`);
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Dashboard Debug Setup</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Configure Dashboard</h2>
        
        <div className="mb-4">
          <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700 mb-1">
            Tenant ID
          </label>
          <input
            type="text"
            id="tenantId"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter tenant ID"
          />
        </div>
        
        {availableTenants.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Available Tenants
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
              {availableTenants.map(tenant => (
                <button
                  key={tenant.id}
                  onClick={() => setTenantId(tenant.id)}
                  className="text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  <div className="font-medium">{tenant.name}</div>
                  <div className="text-xs text-gray-500 font-mono">{tenant.id}</div>
                </button>
              ))}
            </div>
          </div>
        )}

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

        <div className="flex justify-end space-x-3">
          <button
            onClick={viewDashboard}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            View Dashboard
          </button>
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
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Dashboard Debug Controls</h2>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => router.push('/dashboard')}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Go to Main Dashboard
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <button 
              onClick={async () => {
                await updateTenantIdInCognito('');
                setTenantId('');
                setMessage('Tenant ID cleared from Cognito');
              }}
              className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Clear Tenant ID Storage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 