'use client';


import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Container, Typography } from '@/components/ui/TailwindComponents';
import { logger } from '@/utils/logger';
import Image from 'next/image';

export default function OnboardingIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user has any onboarding cookies
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        try {
          acc[key] = decodeURIComponent(value);
        } catch (e) {
          acc[key] = value;
        }
      }
      return acc;
    }, {});

    logger.debug('[OnboardingIndex] Checking cookies:', {
      cookies: Object.keys(cookies),
      onboardingStep: cookies.onboardingStep,
      onboardedStatus: cookies.onboardedStatus,
    });

    // Determine where to redirect based on cookies
    let redirectPath = '/onboarding/business-info';

    if (cookies.onboardingStep === 'subscription') {
      redirectPath = '/onboarding/subscription';
    } else if (cookies.onboardingStep === 'payment') {
      redirectPath = '/onboarding/payment';
    } else if (cookies.onboardingStep === 'setup') {
      redirectPath = '/onboarding/setup';
    } else if (cookies.onboardingStep === 'complete') {
      redirectPath = '/dashboard';
    }

    // Log and perform the redirect
    logger.info(`[OnboardingIndex] Redirecting to ${redirectPath}`);
    setTimeout(() => {
      router.replace(redirectPath);
    }, 500);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="mb-8">
        <Image
          src="/static/images/Pyfactor.png"
          alt="Dott Logo"
          width={180}
          height={60}
          priority
        />
      </div>
      
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
        <div className="mb-4">
          <div className="w-12 h-12 mx-auto mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-main"></div>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Preparing Your Onboarding Experience
          </h1>
          <p className="text-gray-600">
            Please wait while we determine where you left off...
          </p>
        </div>
      </div>
    </div>
  );
}