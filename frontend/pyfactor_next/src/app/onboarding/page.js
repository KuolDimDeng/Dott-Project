'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import SimplifiedOnboardingForm from '@/components/Onboarding/SimplifiedOnboardingForm';
import LoadingSpinner from '@/components/LoadingSpinner';

/**
 * Main Onboarding Page - Now uses the simplified Auth0-only approach
 * 
 * This page has been updated to use the new SimplifiedOnboardingForm
 * which handles the complete onboarding flow in a single form.
 */

function OnboardingPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Check if user is authenticated via Auth0 session
    const checkAuthStatus = async () => {
      try {
        logger.info('[Onboarding] Checking Auth0 authentication status');
        
        // Check for Auth0 session
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          logger.info('[Onboarding] User authenticated:', userData.email);
          
          // Check if onboarding is already completed
          if (userData.onboardingCompleted || userData.onboarding_completed) {
            logger.info('[Onboarding] User already completed onboarding, redirecting to dashboard');
            const tenantId = userData.tenant_id || userData.tenantId;
            if (tenantId) {
              router.push(`/tenant/${tenantId}/dashboard`);
              return;
            } else {
              router.push('/dashboard');
              return;
            }
          }
          
          // User is authenticated but needs onboarding
          setIsCheckingAuth(false);
        } else if (response.status === 401) {
          // User not authenticated, redirect to login
          logger.info('[Onboarding] User not authenticated, redirecting to login');
          router.push('/api/auth/login?returnTo=' + encodeURIComponent('/onboarding'));
        } else {
          throw new Error(`Authentication check failed: ${response.status}`);
        }
      } catch (error) {
        logger.error('[Onboarding] Auth check error:', error);
        setAuthError(error.message);
        setIsCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, [router]);

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show error if authentication check failed
  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Authentication Error</h3>
            <p className="mt-2 text-sm text-gray-500">
              {authError}
            </p>
            <div className="mt-6">
              <button
                onClick={() => window.location.href = '/api/auth/login'}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated and needs onboarding - show the simplified form
  return <SimplifiedOnboardingForm />;
}

export default OnboardingPage;