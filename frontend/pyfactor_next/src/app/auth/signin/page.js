'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import SignInForm from '@/components/auth/SignInForm';
import { getCurrentUser } from '@aws-amplify/auth';
import LoadingSpinner from '@/components/LoadingSpinner';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        // Check if user is already signed in
        const currentUser = await getCurrentUser();
        
        if (currentUser) {
          logger.debug('[SignInPage] User already signed in, checking status');
          
          try {
            const onboardingStatus = currentUser.attributes?.['custom:onboarding'];
            
            logger.debug('[SignInPage] User status:', {
              onboardingStatus,
              attributes: currentUser.attributes
            });
            
            // Handle different onboarding statuses
            switch (onboardingStatus) {
              case 'NOT_STARTED':
              case 'IN_PROGRESS':
              case 'BUSINESS_INFO':
                logger.debug(`[SignInPage] Redirecting to business info for ${onboardingStatus} status`);
                router.push('/onboarding/business-info');
                return;
              case 'SUBSCRIPTION':
                logger.debug('[SignInPage] Redirecting to subscription page');
                router.push('/onboarding/subscription');
                return;
              case 'PAYMENT':
                logger.debug('[SignInPage] Redirecting to payment page');
                router.push('/onboarding/payment');
                return;
              case 'SETUP':
                logger.debug('[SignInPage] Redirecting to setup page');
                router.push('/onboarding/setup');
                return;
              case 'COMPLETE':
                logger.debug('[SignInPage] User onboarded, redirecting to dashboard');
                router.push('/dashboard');
                return;
              default:
                logger.debug('[SignInPage] Unknown onboarding status, showing sign in form');
                break;
            }
          } catch (attributeError) {
            logger.error('[SignInPage] Error getting user attributes:', attributeError);
            // Continue to show sign in form
          }
        }
      } catch (error) {
        logger.debug('[SignInPage] No active session, showing sign in form');
        // Not signed in, show the sign in form
      } finally {
        setIsLoading(false);
      }
    };

    checkUserStatus();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>Please try again later or contact support if the problem persists.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="flex min-h-screen">
        {/* Left Column - Sign In Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center p-6 lg:px-10 xl:px-14">
          <div>
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <Link href="/">
                <Image
                  src="/static/images/PyfactorLandingpage.png"
                  alt="Dott Logo"
                  width={140}
                  height={50}
                  style={{ objectFit: 'contain' }}
                  priority
                  className="cursor-pointer"
                />
              </Link>
            </div>
            
            {/* Auth Form */}
            <div className="bg-white p-8 rounded-2xl shadow-xl">
              <SignInForm />
              
              {/* Policy Links */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-gray-500">
                  <Link 
                    href="/terms" 
                    className="hover:text-blue-600 transition-colors"
                  >
                    {t('footer_link_terms_of_use', 'Terms of Use')}
                  </Link>
                  <span className="hidden md:inline">&middot;</span>
                  <Link 
                    href="/privacy" 
                    className="hover:text-blue-600 transition-colors"
                  >
                    {t('footer_link_privacy_policy', 'Privacy Policy')}
                  </Link>
                  <span className="hidden md:inline">&middot;</span>
                  <Link 
                    href="/cookies" 
                    className="hover:text-blue-600 transition-colors"
                  >
                    {t('footer_link_cookie_policy', 'Cookie Policy')}
                  </Link>
                </div>
                
                <div className="mt-4 text-center text-xs text-gray-400">
                  &copy; {new Date().getFullYear()} Dott, LLC. All rights reserved.
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - App Info & Image */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <div className="flex flex-col items-center justify-center p-6 lg:p-10">
            <div className="max-w-md">
              <p className="text-lg mb-6 opacity-90 text-center">
                Global business management with advanced inventory tracking, barcode scanning, 
                and regional payment solutions—all in one intuitive platform.
              </p>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-400 flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-sm font-bold">✓</span>
                  </div>
                  <p className="text-sm opacity-90">Financial management tools for small businesses</p>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-400 flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-sm font-bold">✓</span>
                  </div>
                  <p className="text-sm opacity-90">Multi-currency support in 100+ countries</p>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-400 flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-sm font-bold">✓</span>
                  </div>
                  <p className="text-sm opacity-90">Inventory management with barcode scanning</p>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-400 flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-sm font-bold">✓</span>
                  </div>
                  <p className="text-sm opacity-90">Secure platform accessible from anywhere</p>
                </div>
              </div>
              
              {/* Image */}
              <div className="relative w-full h-64 flex justify-center">
                <Image
                  src="/static/images/Work-From-Home-3--Streamline-Brooklyn.png"
                  alt="Dott Platform Illustration"
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                  className="drop-shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
