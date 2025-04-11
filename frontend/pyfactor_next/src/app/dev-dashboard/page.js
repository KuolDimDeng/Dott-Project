'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function DevDashboard() {
  const searchParams = useSearchParams();
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Get tenant ID from URL parameters
    const urlTenantId = searchParams.get('tenantId');
    
    // Check cookies and localStorage if not in URL
    const getCookieTenantId = () => {
      return document.cookie
        .split('; ')
        .find(row => row.startsWith('tenantId='))
        ?.split('=')[1];
    };
    
    const cookieTenantId = getCookieTenantId();
    const storageTenantId = localStorage.getItem('tenantId');
    
    // Use the first available tenant ID
    const effectiveTenantId = urlTenantId || cookieTenantId || storageTenantId || 'unknown';
    
    // Update state
    setTenantId(effectiveTenantId);
    setLoading(false);
    
    console.log('[DevDashboard] Initialized with tenant ID:', effectiveTenantId);
    
    // Set the tenant ID in cookies and localStorage if not already there
    if (effectiveTenantId) {
      if (!cookieTenantId) {
        document.cookie = `tenantId=${effectiveTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
      }
      
      if (!storageTenantId) {
        localStorage.setItem('tenantId', effectiveTenantId);
      }
    }
  }, [searchParams]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-medium text-gray-700">Loading Development Dashboard...</h1>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Development Dashboard
          </h1>
          <p className="mt-3 text-xl text-gray-500">
            This is a development-only dashboard for testing with non-UUID tenant IDs.
          </p>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Tenant Information</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Development environment details.</p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Tenant ID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{tenantId}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Environment</dt>
                <dd className="mt-1 text-sm text-gray-900">Development</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Mode</dt>
                <dd className="mt-1 text-sm text-gray-900">Testing</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-blue-600">Active</dd>
              </div>
            </dl>
          </div>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Development Tools</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Tools for testing the application.</p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/" 
              className="group relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Home Page</h3>
              <p className="mt-1 text-sm text-gray-500">Return to the main application home page.</p>
            </Link>
            
            <Link href="/auth/signin" 
              className="group relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Sign In</h3>
              <p className="mt-1 text-sm text-gray-500">Go to the authentication page.</p>
            </Link>
            
            <Link href="/onboarding/business-info" 
              className="group relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Onboarding</h3>
              <p className="mt-1 text-sm text-gray-500">Start the onboarding process again.</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 