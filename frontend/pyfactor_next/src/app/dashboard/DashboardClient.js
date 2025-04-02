'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardWrapper from './DashboardWrapper';
import { logger } from '@/utils/logger';
import { COOKIE_NAMES, ONBOARDING_STATUS } from '@/constants/onboarding';

export default function DashboardClient() {
  const [isClient, setIsClient] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // This ensures we're only rendering on the client
  useEffect(() => {
    setIsClient(true);
    
    // CRITICAL: Force dashboard to stay on the dashboard page if cookies indicate onboarding is complete
    // This override happens very early to prevent redirects
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    
    const onboardingStatus = getCookie(COOKIE_NAMES.ONBOARDING_STATUS);
    const setupCompleted = getCookie(COOKIE_NAMES.SETUP_COMPLETED);
    
    // Enhanced check: If on dashboard or being redirected to onboarding but cookies say complete
    if ((window.location.pathname.startsWith('/onboarding') || window.location.pathname.startsWith('/dashboard')) && 
        (onboardingStatus === ONBOARDING_STATUS.COMPLETE || setupCompleted === 'true')) {
      logger.info('[DashboardClient] Detected onboarding cookies set as complete');
      
      // Update Cognito attributes to ensure consistency
      try {
        fetch('/api/user/update-attributes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attributes: {
              'custom:onboarding': ONBOARDING_STATUS.COMPLETE,
              'custom:setupdone': 'TRUE'
            },
            forceUpdate: true
          })
        }).then(response => {
          if (response.ok) {
            logger.info('[DashboardClient] Successfully updated Cognito attributes');
          } else {
            logger.warn('[DashboardClient] Failed to update Cognito attributes');
          }
        });
      } catch (error) {
        logger.error('[DashboardClient] Error updating Cognito attributes:', error);
      }
      
      // If being redirected to onboarding but we should be in dashboard
      if (window.location.pathname.startsWith('/onboarding')) {
        logger.info('[DashboardClient] Detected attempted onboarding redirect with completed cookies, forcing back to dashboard');
        router.replace('/dashboard');
      }
    }
  }, [router]);
  
  // Extract any query parameters
  const newAccount = searchParams?.get('newAccount') === 'true';
  const plan = searchParams?.get('plan') || '';
  
  // Log for debugging
  useEffect(() => {
    if (isClient) {
      logger.debug('[Dashboard] Mounting dashboard client component', {
        newAccount,
        plan,
      });
    }
  }, [isClient, newAccount, plan]);
  
  // Only render on the client to prevent SSR issues
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-blue-400 mb-4"></div>
          <div className="h-4 w-32 bg-gray-400 rounded mb-2"></div>
          <div className="h-3 w-24 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }
  
  return <DashboardWrapper newAccount={newAccount} plan={plan} />;
} 