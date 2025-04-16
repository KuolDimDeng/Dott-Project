'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { useUser } from '@/hooks/useUser';
import { fetchWithCache } from '@/utils/cacheClient';
import { logger } from '@/utils/logger';

export default function OnboardingCompletePage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const completeOnboarding = async () => {
      try {
        setLoading(true);
        
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        logger.debug('[OnboardingComplete] Completing onboarding process', { userId: user.id });
        
        // Mark onboarding as complete
        await fetchWithCache('user_onboarding_status', {
          userId: user.id,
          status: 'completed',
          completedAt: new Date().toISOString()
        }, { bypassCache: true });
        
        // Small delay to show the completion page
        setTimeout(() => {
          setLoading(false);
        }, 1000);
        
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } catch (error) {
        logger.error('[OnboardingComplete] Error completing onboarding:', error);
        setError(error.message || 'Failed to complete onboarding process');
        setLoading(false);
      }
    };
    
    if (user && !userLoading) {
      completeOnboarding();
    }
  }, [user, userLoading, router]);
  
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold text-center text-gray-900">
            Something went wrong
          </h2>
          <p className="mt-2 text-sm text-center text-gray-600">
            {error}
          </p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/onboarding/business-info')}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Restart Onboarding
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg text-center">
        {loading ? (
          <>
            <div className="flex justify-center">
              <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">
              Finalizing your account...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we set up your dashboard
            </p>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <CheckCircleIcon className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              Onboarding Complete!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your account has been successfully set up. You'll be redirected to your dashboard in a few seconds.
            </p>
            <div className="mt-8">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 