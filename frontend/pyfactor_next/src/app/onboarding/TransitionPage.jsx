'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { 
  COOKIE_NAMES, 
  ONBOARDING_STEPS
} from '@/constants/onboarding';

/**
 * Reusable transition component for smooth navigation between onboarding steps
 * 
 * @param {Object} props
 * @param {string} props.from - Source step name
 * @param {string} props.to - Destination step name 
 * @param {string} props.toPath - Full path to navigate to (overrides 'to')
 * @param {string} props.message - Custom loading message
 * @param {number} props.delayMs - Delay in ms before navigation (default: 1500)
 * @param {Object} props.data - Any data to pass to the next step
 * @param {Function} props.onBeforeNavigate - Function to call before navigation
 */
export default function TransitionPage({
  from = '',
  to = '',
  toPath = '',
  message = '',
  delayMs = 1500,
  data = null,
  onBeforeNavigate = null,
}) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(Math.ceil(delayMs / 1000));
  const [progress, setProgress] = useState(0);
  
  // Default messages based on transition type
  const getDefaultMessage = () => {
    if (from === ONBOARDING_STEPS.BUSINESS_INFO && to === ONBOARDING_STEPS.SUBSCRIPTION) {
      return 'Saving your business information...';
    } else if (from === ONBOARDING_STEPS.SUBSCRIPTION && to === ONBOARDING_STEPS.PAYMENT) {
      return 'Preparing payment options...';
    } else if (from === ONBOARDING_STEPS.SUBSCRIPTION && to === 'dashboard') {
      return 'Setting up your free account...';
    } else if (from === ONBOARDING_STEPS.PAYMENT && to === ONBOARDING_STEPS.SETUP) {
      return 'Processing your payment...';
    } else if (from === ONBOARDING_STEPS.PAYMENT && to === 'dashboard') {
      return 'Finalizing your account setup...';
    } else if (to === 'dashboard') {
      return 'Redirecting to dashboard...';
    } else {
      return 'Redirecting to next step...';
    }
  };
  
  // Calculate the destination URL
  const getDestinationUrl = () => {
    if (toPath) return toPath;
    
    if (to === 'dashboard') {
      return '/dashboard';
    } else {
      return `/onboarding/${to}`;
    }
  };
  
  // Handle data persistence between steps
  const persistData = () => {
    if (!data) return;
    
    try {
      // Store data in sessionStorage for the next step
      sessionStorage.setItem('onboardingTransitionData', JSON.stringify({
        from,
        to,
        timestamp: Date.now(),
        data
      }));
    } catch (e) {
      console.error('Failed to persist transition data:', e);
    }
  };
  
  // Set up navigation timer
  useEffect(() => {
    // Update progress continuously
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / (delayMs / 100));
        return Math.min(newProgress, 100);
      });
    }, 100);
    
    // Update countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown(prev => Math.max(prev - 1, 0));
    }, 1000);
    
    // Perform the navigation after delay
    const navigationTimer = setTimeout(() => {
      persistData();
      
      // Execute pre-navigation callback if provided
      if (onBeforeNavigate) {
        try {
          onBeforeNavigate();
        } catch (e) {
          console.error('Error in onBeforeNavigate callback:', e);
        }
      }
      
      // Navigate to destination
      const destinationUrl = getDestinationUrl();
      router.push(destinationUrl);
    }, delayMs);
    
    // Clean up
    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
      clearTimeout(navigationTimer);
    };
  }, [delayMs, router, from, to, toPath, onBeforeNavigate, data]);
  
  // Show loading UI with progress indicator
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-8 rounded-xl bg-white shadow-sm">
        <LoadingSpinner size="large" showProgress progress={progress} />
        <h2 className="mt-6 text-xl font-semibold text-gray-800">
          {message || getDefaultMessage()}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Redirecting {to ? `to ${to}` : ''} in {countdown} second{countdown !== 1 ? 's' : ''}
        </p>
        <div className="mt-6 w-full bg-gray-100 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
} 