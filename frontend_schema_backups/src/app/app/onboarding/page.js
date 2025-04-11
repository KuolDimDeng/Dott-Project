'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    logger.debug('[OnboardingPage] Checking authentication status');
    
    // Check if user is authenticated
    const authSuccess = localStorage.getItem('authSuccess');
    const authUser = localStorage.getItem('authUser');
    
    if (!authSuccess || !authUser) {
      logger.warn('[OnboardingPage] User not authenticated, redirecting to sign in');
      router.push('/auth/signin');
      return;
    }
    
    logger.debug('[OnboardingPage] User authenticated, proceeding with onboarding');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome to PyFactor
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Let's get you set up
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Onboarding Steps</h3>
              <p className="mt-1 text-sm text-gray-500">
                Please complete the following steps to get started:
              </p>
            </div>
            
            {/* Add your onboarding steps here */}
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-5 w-5 text-green-400">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Email Verified</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="flex-shrink-0 h-5 w-5 text-gray-400">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Complete Profile</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 