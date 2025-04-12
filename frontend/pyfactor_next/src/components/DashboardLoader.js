'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function DashboardLoader({ message = 'Loading dashboard...' }) {
  const [tenantId, setTenantId] = useState(null);
  const params = useParams();
  
  useEffect(() => {
    // Get tenant ID from URL parameters first (if available)
    const urlTenantId = params?.tenantId;
    
    // Then try to get from localStorage as fallback
    const localStorageTenantId = typeof window !== 'undefined' ? 
      localStorage.getItem('tenantId') || localStorage.getItem('businessid') : 
      null;
    
    // Set the tenant ID, prioritizing URL param over localStorage
    setTenantId(urlTenantId || localStorageTenantId);
  }, [params]);

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="flex flex-col items-center">
        {/* Logo at the top */}
        <div className="mb-8">
          <img 
            src="/static/images/PyfactorDashboard.png" 
            alt="Pyfactor Logo" 
            className="h-12 w-auto" 
          />
        </div>
        
        {/* Tailwind CSS Circular Spinner */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-100 border-solid rounded-full"></div>
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent border-solid rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        
        {/* Loading message */}
        <p className="mt-4 text-gray-600 font-medium">{message}</p>
        
        {/* Display tenant ID if available */}
        {tenantId && (
          <p className="mt-2 text-blue-500 text-sm font-medium">
            Tenant ID: {tenantId}
          </p>
        )}
      </div>
    </div>
  );
} 