import appCache from '../utils/appCache';

'use client';

import { appCache } from '../utils/appCache';
import { useEffect, useState } from 'react';
import { appCache } from '../utils/appCache';
import { useRouter } from 'next/navigation';
import { appCache } from '../utils/appCache';
import { logger } from '@/utils/logger';

export default function OnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    logger.debug('[OnboardingPage] Checking authentication status');
    
    // Helper to initialize app cache
    if (typeof window !== 'undefined') {
      if (!appCache.getAll()) appCache.getAll() = {};
      if (!appCache.getAll().auth) appCache.getAll().auth = {};
    }
    
    // Function to check authentication
    const checkAuth = async () => {
      // First try Cognito authentication
      try {
        const { fetchAuthSession } = await import('@/config/amplifyUnified');
        const session = await fetchAuthSession();
        
        if (session?.tokens?.idToken) {
          // User is authenticated via Cognito
          logger.debug('[OnboardingPage] User authenticated via Cognito');
          
          // Store in app cache
          if (typeof window !== 'undefined') {
            appCache.set('auth.authSuccess', true);
            
            // Try to extract email from token
            try {
              const idToken = session.tokens.idToken.toString();
              const payload = JSON.parse(atob(idToken.split('.')[1]));
              if (payload.email) {
                appCache.set('auth.email', payload.email);
              }
            } catch (e) {
              logger.warn('[OnboardingPage] Could not extract email from token:', e);
            }
          }
          
          // Allow proceed with onboarding
          setIsLoading(false);
          return;
        }
      } catch (e) {
        logger.warn('[OnboardingPage] Error checking Cognito auth:', e);
      }
      
      // Fallback to app cache
      if (typeof window !== 'undefined' && 
          appCache.getAll()
          appCache.getAll()
        logger.debug('[OnboardingPage] User authenticated via app cache');
        setIsLoading(false);
        return;
      }
      
      // User not authenticated, redirect to sign in
      logger.warn('[OnboardingPage] User not authenticated, redirecting to sign in');
      router.push('/auth/signin');
    };
    
    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    );
  }

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