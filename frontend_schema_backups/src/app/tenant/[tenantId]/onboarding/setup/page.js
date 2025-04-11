'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { logger } from '@/utils/logger';

export default function TenantOnboardingSetupPage({ params }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { tenantId } = params;

  useEffect(() => {
    if (!tenantId) {
      router.push('/onboarding/setup');
      return;
    }

    try {
      // Format tenant ID (replace underscores with hyphens if needed)
      const formattedTenantId = tenantId.replace(/_/g, '-');
      
      // Store tenant ID in localStorage and cookies
      localStorage.setItem('tenantId', formattedTenantId);
      
      // Set cookie with 7-day expiration
      const expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + 7);
      document.cookie = `tenantId=${formattedTenantId}; path=/; expires=${expiresDate.toUTCString()}; SameSite=Lax`;
      
      logger.debug(`[TenantOnboardingSetupPage] Stored tenant ID: ${formattedTenantId}`);
      
      // Redirect to main onboarding setup page after storing tenant ID
      setTimeout(() => {
        router.push('/onboarding/setup');
      }, 500);
    } catch (error) {
      logger.error('[TenantOnboardingSetupPage] Error setting tenant data:', error);
      
      // Redirect to main onboarding setup page on error
      router.push('/onboarding/setup');
    }
  }, [tenantId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <LoadingSpinner />
      <p className="mt-4 text-gray-600">Loading setup page...</p>
    </div>
  );
} 