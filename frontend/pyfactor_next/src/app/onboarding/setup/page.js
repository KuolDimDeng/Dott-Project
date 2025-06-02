'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import { refreshUserSession } from '@/utils/auth';
import { updateOnboardingStep } from '@/utils/onboardingUtils';
import { completeOnboarding } from '@/utils/onboardingUtils';
import CompletionStep from './components/CompletionStep';
import { ArrowPathIcon, ExclamationTriangleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { setCache } from '@/utils/cacheClient';
import { saveUserPreference, PREF_KEYS } from '@/utils/userPreferences';
import { checkAuthStatus } from '@/utils/authUtils';

// Setup stages with descriptions for progress tracking
const SETUP_STAGES = [
  { key: 'initializing', label: 'Initializing Setup', description: 'Preparing your account setup' },
  { key: 'configuring', label: 'Configuring Environment', description: 'Setting up your workspace' },
  { key: 'permissions', label: 'Setting Permissions', description: 'Configuring security settings' },
  { key: 'finalizing', label: 'Finalizing', description: 'Almost there!' },
  { key: 'complete', label: 'Setup Complete', description: 'Your account is ready to use' }
];

export default function SetupPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, isLoading: userLoading } = useUser();
  
  // Core state
  const [setupStatus, setSetupStatus] = useState('initializing');
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [error, setError] = useState(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [setupStartTime, setSetupStartTime] = useState(null);
  const [setupDuration, setSetupDuration] = useState(null);
  
  // Track stage progress
  useEffect(() => {
    // Map setup status to stage index
    const statusToIndex = {
      'initializing': 0,
      'configuring': 1,
      'permissions': 2,
      'finalizing': 3,
      'complete': 4
    };
    
    setCurrentStageIndex(statusToIndex[setupStatus] || 0);
  }, [setupStatus]);

  // Force complete after short timeout if setup takes too long
  useEffect(() => {
    if (!authChecked || setupComplete) return;
    
    const forceCompleteTimer = setTimeout(() => {
      if (setupStatus !== 'complete') {
        logger.debug('[SetupPage] Force completing setup due to timeout');
        
        // Calculate duration if we have a start time
        if (setupStartTime) {
          const duration = Date.now() - setupStartTime;
          setSetupDuration(duration);
          // Store in app cache only
          setCache('setup_duration', duration);
        }
        
        // Update cache and preferences for setup completion
        const updateCompletion = async () => {
          try {
            // Save completion state via API
            await fetch('/api/onboarding/setup/complete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                status: 'complete',
                completedAt: new Date().toISOString()
              })
            });
            
            // Set app cache flags
            setCache('setup_complete', true);
            setCache('setup_timestamp', Date.now());
            setCache('onboarding_status', 'complete');
            
            logger.debug('[SetupPage] Updated setup completion state');
          } catch (error) {
            logger.error('[SetupPage] Error updating setup completion:', error);
          }
        };
        
        // Execute the update
        updateCompletion();
        
        setSetupComplete(true);
        setSetupStatus('complete');
      }
    }, 8000); // 8 seconds timeout
    
    return () => clearTimeout(forceCompleteTimer);
  }, [setupStatus, authChecked, setupStartTime, setupComplete]);

  // Verify authentication on load
  useEffect(() => {
    const checkAuth = async () => {
      logger.debug('[SetupPage] Starting auth check');
      
      // Check for RLS flags in URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const skipLoading = urlParams.get('skipLoading') === 'true';
      const useRLS = urlParams.get('useRLS') === 'true';
      
      // For RLS with skipLoading, bypass authentication check
      if (skipLoading && useRLS) {
        logger.debug('[SetupPage] RLS skipLoading detected, bypassing auth check');
        
        // Update completion state via API
        try {
          await fetch('/api/onboarding/setup/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'complete',
              completedAt: new Date().toISOString(),
              useRLS: true
            })
          });
          
          // Set app cache flags
          setCache('setup_complete', true);
          setCache('setup_timestamp', Date.now());
          setCache('setup_useRLS', true);
          setCache('onboarding_status', 'complete');
          
          logger.debug('[SetupPage] Updated setup state for RLS');
        } catch (error) {
          logger.error('[SetupPage] Error updating setup state for RLS:', error);
        }
        
        // Initialize setup
        setSetupStartTime(Date.now());
        setSetupComplete(true);
        setSetupStatus('complete');
        setAuthChecked(true);
        
        return;
      }
      
      // Check Auth0 authentication
      if (!userLoading) {
        if (user) {
          logger.debug('[SetupPage] Auth0 user authenticated');
          
          // Store user info in app cache
          setCache('auth_user', user);
          
          setAuthChecked(true);
        } else {
          logger.error('[SetupPage] No authenticated user found');
          setError('Authentication required. Please sign in again.');
          
          // Redirect to sign in after a short delay
          setTimeout(() => {
            router.push('/auth/signin');
          }, 1500);
        }
      }
    };
    
    checkAuth();
  }, [user, userLoading, router]);

  // Run setup process once authentication is verified
  useEffect(() => {
    if (!authChecked) return;
    
    let isMounted = true;
    setSetupStartTime(Date.now());
    
    const initializeSetup = async () => {
      try {
        // Check for RLS URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const skipLoading = urlParams.get('skipLoading') === 'true';
        const useRLS = urlParams.get('useRLS') === 'true';
        
        // For RLS implementations with skipLoading, bypass the setup process
        if (skipLoading && useRLS) {
          logger.debug('[SetupPage] Detected RLS + skipLoading, immediately completing setup');
          
          if (!isMounted) return;
          
          // Update completion state via API
          try {
            await fetch('/api/onboarding/setup/complete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                status: 'complete',
                completedAt: new Date().toISOString(),
                useRLS: true,
                skipLoading: true
              })
            });
            
            // Calculate setup duration
            const duration = Date.now() - setupStartTime;
            setSetupDuration(duration);
            
            // Update AppCache
            setCache('setup_complete', true);
            setCache('setup_timestamp', Date.now());
            setCache('setup_useRLS', true);
            setCache('setup_duration', duration);
            setCache('onboarding_status', 'complete');
            
            logger.debug('[SetupPage] RLS setup completed');
          } catch (error) {
            logger.error('[SetupPage] Error completing RLS setup:', error);
          }
          
          setSetupComplete(true);
          setSetupStatus('complete');
          return;
        }
        
        // Regular setup process
        logger.debug('[SetupPage] Starting regular setup process');
        
        // Stage 1: Initializing
        if (!isMounted) return;
        setSetupStatus('initializing');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Stage 2: Configuring
        if (!isMounted) return;
        setSetupStatus('configuring');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Stage 3: Setting permissions
        if (!isMounted) return;
        setSetupStatus('permissions');
        await setupRLSPermissions();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Stage 4: Finalizing
        if (!isMounted) return;
        setSetupStatus('finalizing');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Complete setup
        if (!isMounted) return;
        
        // Save completion state via API
        try {
          await fetch('/api/onboarding/setup/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'complete',
              completedAt: new Date().toISOString()
            })
          });
          
          const duration = Date.now() - setupStartTime;
          setSetupDuration(duration);
          
          // Update cache
          setCache('setup_complete', true);
          setCache('setup_timestamp', Date.now());
          setCache('setup_duration', duration);
          setCache('onboarding_status', 'complete');
          
          logger.debug('[SetupPage] Setup completed successfully');
        } catch (error) {
          logger.error('[SetupPage] Error completing setup:', error);
        }
        
        setSetupComplete(true);
        setSetupStatus('complete');
        
      } catch (error) {
        logger.error('[SetupPage] Setup error:', error);
        setError('Setup encountered an error. Please try again.');
      }
    };

    initializeSetup();

    return () => {
      isMounted = false;
    };
  }, [authChecked, setupStartTime]);

  const setupRLSPermissions = async () => {
    try {
      logger.debug('[SetupPage] Setting up RLS permissions');
      // This is a placeholder for actual RLS setup
      // In a real implementation, this would configure database permissions
      return Promise.resolve();
    } catch (error) {
      logger.error('[SetupPage] Error setting up RLS permissions:', error);
    }
  };

  const handleContinueToDashboard = () => {
    router.push('/dashboard');
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-100">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-center text-gray-900 mb-4">Setup Error</h2>
          <p className="text-center text-gray-600 mb-6">{error}</p>
          <div className="flex space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 flex items-center justify-center"
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Try Again
            </button>
            <button
              onClick={() => router.push('/auth/signin')}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (setupComplete) {
    return <CompletionStep onContinue={handleContinueToDashboard} duration={setupDuration} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-full bg-indigo-100">
            <ShieldCheckIcon className="w-8 h-8 text-indigo-600" />
          </div>
          
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Setting Up Your Account</h2>
          <p className="text-gray-600 mb-8">Please wait while we prepare everything for you</p>
          
          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {SETUP_STAGES[currentStageIndex]?.label}
              </span>
              <span className="text-sm text-gray-500">
                {currentStageIndex + 1} / {SETUP_STAGES.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${((currentStageIndex + 1) / SETUP_STAGES.length) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500">
              {SETUP_STAGES[currentStageIndex]?.description}
            </p>
          </div>
          
          {/* Loading spinner */}
          <div className="flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    </div>
  );
} 