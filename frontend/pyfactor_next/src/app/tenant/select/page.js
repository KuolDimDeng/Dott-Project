'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/lib/apiService';
import { storeTenantId, clearTenantStorage } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import AppBar from '@/app/components/AppBar';

export default function TenantSelectionPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Fetch all tenants user has access to
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        setLoading(true);
        const tenantList = await apiService.getUserTenants();
        setTenants(tenantList);
        setError(null);
      } catch (error) {
        logger.error('[TenantSelect] Error fetching tenants:', error);
        setError('Failed to load available tenants. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, []);

  // Handle tenant selection
  const handleSelectTenant = async (tenantId) => {
    try {
      setLoading(true);
      
      // Clear previous tenant data
      clearTenantStorage();
      
      // Store the new tenant ID
      storeTenantId(tenantId);
      
      logger.info(`[TenantSelect] Switched to tenant: ${tenantId}`);
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      logger.error('[TenantSelect] Error selecting tenant:', error);
      setError('Failed to switch tenant. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <AppBar />
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Select a Tenant
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Choose which tenant you want to access
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <div className="flex">
                <div className="text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center text-gray-500">
              <p>You don't have access to any tenants.</p>
              <button
                onClick={() => router.push('/login')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => handleSelectTenant(tenant.id)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {tenant.name}
                    </p>
                    {tenant.description && (
                      <p className="text-xs text-gray-500">
                        {tenant.description}
                      </p>
                    )}
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 