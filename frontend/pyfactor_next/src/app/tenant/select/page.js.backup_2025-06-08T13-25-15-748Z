'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import LoadingSpinner from '@/components/LoadingSpinner';

/**
 * This is a simple redirect page that will take users to the dashboard
 * when the tenant selection page is accessed.
 * 
 * We're keeping this page to avoid 404 errors when the middleware redirects here,
 * but we immediately redirect users to the dashboard.
 */
export default function TenantSelectPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Check for free plan selection
    const hasFreeSelected = document.cookie.includes('freePlanSelected=true') || 
                            localStorage.getItem('freePlanSelected') === 'true';
                            
    const hasCompletedStatus = document.cookie.includes('onboardedStatus=complete') ||
                               localStorage.getItem('onboardingStatus') === 'complete';
    
    // Prioritize the query string for errors
    const url = new URL(window.location.href);
    const errorParam = url.searchParams.get('error');
    
    // If we have a tenant error but the free plan was selected, bypass and go to dashboard
    if (errorParam && (hasFreeSelected || hasCompletedStatus)) {
      console.log('[TenantSelectPage] Bypassing tenant selection for free plan user');
      // Force quick delay then redirect to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard?newAccount=true&noLoading=true';
      }, 100);
      return;
    }
    
    logger.info('[RootLayout] Page loaded:', {
      pathname: window.location.pathname,
      tenantId: null,
      businessId: null
    });
  }, []);
  
  // Display a simple redirection page
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-md">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Please wait
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Redirecting you to the dashboard...
          </p>
        </div>
      </div>
    </div>
  );
} 