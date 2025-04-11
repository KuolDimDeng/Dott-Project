'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import { refreshUserSession } from '@/utils/refreshUserSession';
import { updateOnboardingStep } from '@/utils/onboardingUtils';
import { completeOnboarding } from '@/utils/completeOnboarding';
import { fetchAuthSession } from 'aws-amplify/auth';
import CompletionStep from './components/CompletionStep';
import { ArrowPathIcon, ExclamationTriangleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

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
          localStorage.setItem('setupDuration', duration.toString());
        }
        
        // Mark setup as complete in cookies with 30-day expiration
        const expiresDate = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);
        const cookieOptions = `path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
        
        document.cookie = `setupCompleted=true; ${cookieOptions}`;
        document.cookie = `onboardingStep=complete; ${cookieOptions}`;
        document.cookie = `onboardedStatus=complete; ${cookieOptions}`;
        document.cookie = `hasSession=true; ${cookieOptions}`;
        
        // Set localStorage flags
        localStorage.setItem('setupComplete', 'true');
        localStorage.setItem('setupTimestamp', Date.now().toString());
        
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
        
        // Set cookies with 30-day expiration
        const expiresDate = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);
        const cookieOptions = `path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
        
        document.cookie = `setupCompleted=true; ${cookieOptions}`;
        document.cookie = `onboardingStep=complete; ${cookieOptions}`;
        document.cookie = `onboardedStatus=complete; ${cookieOptions}`;
        document.cookie = `hasSession=true; ${cookieOptions}`;
        
        localStorage.setItem('setupComplete', 'true');
        localStorage.setItem('setupTimestamp', Date.now().toString());
        
        // Initialize setup
        setSetupStartTime(Date.now());
        setSetupComplete(true);
        setSetupStatus('complete');
        setAuthChecked(true);
        
        return;
      }
      
      try {
        // Verify we have valid tokens
        const { tokens } = await fetchAuthSession();
        if (!tokens?.idToken) {
          logger.error('[SetupPage] No valid auth tokens found');
          throw new Error('Authentication required');
        }
        
        logger.debug('[SetupPage] Auth valid, storing tokens');
        
        // Store tokens in localStorage as backup
        localStorage.setItem('idToken', tokens.idToken.toString());
        localStorage.setItem('accessToken', tokens.accessToken.toString());
        
        // Set auth cookie for API calls
        document.cookie = `authToken=true; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
        
        setAuthChecked(true);
      } catch (error) {
        logger.error('[SetupPage] Auth error:', error);
        setError('Authentication error. Please sign in again.');
        
        // Redirect to sign in after a short delay
        setTimeout(() => {
          router.push('/auth/signin');
        }, 1500);
      }
    };
    
    checkAuth();
  }, [router]);

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
          
          // Set cookies and localStorage
          const expiresDate = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);
          const cookieOptions = `path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
          
          document.cookie = `setupCompleted=true; ${cookieOptions}`;
          document.cookie = `onboardingStep=complete; ${cookieOptions}`;
          document.cookie = `onboardedStatus=complete; ${cookieOptions}`;
          
          localStorage.setItem('setupComplete', 'true');
          localStorage.setItem('setupTimestamp', Date.now().toString());
          localStorage.setItem('setupUseRLS', 'true');
          
          // Calculate setup duration
          const duration = Date.now() - setupStartTime;
          setSetupDuration(duration);
          
          setSetupComplete(true);
          setSetupStatus('complete');
          
          return;
        }
        
        // Standard setup flow
        logger.debug('[SetupPage] Starting standard setup');
        
        // Set initial cookies
        const expiresDate = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);
        const cookieOptions = `path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
        document.cookie = `setupInProgress=true; ${cookieOptions}`;
        
        // Start configuration
        if (!isMounted) return;
        setSetupStatus('configuring');
        
        // Refresh session
        try {
          await refreshUserSession();
          logger.debug('[SetupPage] Session refreshed successfully');
        } catch (refreshError) {
          logger.warn('[SetupPage] Session refresh warning:', refreshError);
          // Continue despite refresh errors
        }
        
        // Setup permissions
        if (!isMounted) return;
        setSetupStatus('permissions');
        
        try {
          const result = await setupRLSPermissions();
          logger.debug('[SetupPage] RLS setup result:', result);
        } catch (rlsError) {
          logger.warn('[SetupPage] RLS setup warning:', rlsError);
          // Continue despite errors
        }
        
        // Finalize setup
        if (!isMounted) return;
        setSetupStatus('finalizing');
        
        // Complete onboarding in user attributes
        try {
          await completeOnboarding();
          logger.debug('[SetupPage] Onboarding attributes updated');
        } catch (completionError) {
          logger.warn('[SetupPage] Attribute update warning:', completionError);
          // Continue despite errors
        }
        
        // Set final cookies and localStorage
        document.cookie = `setupCompleted=true; ${cookieOptions}`;
        document.cookie = `onboardingStep=complete; ${cookieOptions}`;
        document.cookie = `onboardedStatus=complete; ${cookieOptions}`;
        document.cookie = `hasSession=true; ${cookieOptions}`;
        
        localStorage.setItem('setupComplete', 'true');
        localStorage.setItem('setupTimestamp', Date.now().toString());
        
        // Calculate setup duration
        const duration = Date.now() - setupStartTime;
        setSetupDuration(duration);
        localStorage.setItem('setupDuration', duration.toString());
        
        // Mark setup as complete
        if (!isMounted) return;
        setSetupComplete(true);
        setSetupStatus('complete');
        
        logger.debug('[SetupPage] Setup completed successfully');
      } catch (error) {
        if (!isMounted) return;
        
        logger.error('[SetupPage] Setup process error:', error);
        setError('Setup error: ' + (error.message || 'Unknown error'));
        setSetupStatus('error');
      }
    };
    
    initializeSetup();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [authChecked, router, setupStartTime]);

  // Helper function to setup RLS permissions
  const setupRLSPermissions = async () => {
    try {
      const response = await axiosInstance.post('/api/onboarding/setup-rls', {
        timestamp: Date.now()
      });
      return response.data;
    } catch (error) {
      logger.error('[SetupPage] RLS setup API error:', error);
      throw error;
    }
  };

  // Handle navigation to dashboard
  const handleContinueToDashboard = () => {
    // Prefetch dashboard data in background
    try {
      fetch('/api/dashboard/prefetch', { 
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {
        // Ignore prefetch errors
      });
    } catch (e) {
      // Ignore prefetch errors
    }
    
    // Navigate to dashboard
    window.location.href = '/dashboard?newAccount=true';
  };

  // Render error state
  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded-xl shadow-sm">
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-16 h-16 mb-6 text-red-500">
            <ExclamationTriangleIcon className="w-full h-full" />
          </div>
          <h2 className="text-xl font-semibold text-red-600 mb-3">Setup Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <ArrowPathIcon className="w-5 h-5" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  // Render completion state
  if (setupComplete) {
    return (
      <div className="max-w-3xl mx-auto mt-6">
        <CompletionStep 
          onContinue={handleContinueToDashboard} 
          setupDuration={setupDuration}
        />
      </div>
    );
  }

  // Render setup in progress state
  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded-xl shadow-sm">
      <div className="flex flex-col items-center py-6">
        {/* Setup progress */}
        <div className="w-full max-w-md mb-8">
          <div className="flex justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-800">
              {SETUP_STAGES[currentStageIndex].label}
            </h2>
            <span className="text-sm font-medium text-blue-600">
              {currentStageIndex + 1}/{SETUP_STAGES.length}
            </span>
          </div>
          
          <p className="text-gray-600 mb-6">
            {SETUP_STAGES[currentStageIndex].description}
          </p>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-6">
            <div 
              className="bg-blue-500 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${(currentStageIndex / (SETUP_STAGES.length - 1)) * 100}%` }}
            ></div>
          </div>
          
          {/* Stage indicators */}
          <div className="flex justify-between w-full">
            {SETUP_STAGES.map((stage, index) => (
              <div key={index} className="flex flex-col items-center">
                <div 
                  className={`w-4 h-4 rounded-full mb-1 flex items-center justify-center ${
                    index < currentStageIndex 
                      ? 'bg-blue-500' 
                      : index === currentStageIndex 
                        ? 'bg-white border-2 border-blue-500' 
                        : 'bg-gray-200'
                  }`}
                >
                  {index < currentStageIndex && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Current action being performed */}
        <div className="flex items-center justify-center mb-8">
          {setupStatus === 'permissions' ? (
            <div className="flex items-center gap-3 text-blue-600">
              <ShieldCheckIcon className="w-8 h-8 animate-pulse" />
              <span>Setting up security permissions...</span>
            </div>
          ) : (
            <LoadingSpinner size="medium" />
          )}
        </div>
        
        <p className="text-sm text-gray-500 text-center max-w-xs">
          This may take a moment. We're setting up your account with everything you need.
        </p>
      </div>
    </div>
  );
} 